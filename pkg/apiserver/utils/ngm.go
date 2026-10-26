// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/fx"
	"golang.org/x/sync/singleflight"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

var (
	NgmErrNS       = errorx.NewNamespace("ngm")
	ErrNgmNotStart = NgmErrNS.NewType("ngm_not_started")
)

type NgmState string

const (
	NgmStateNotSupported NgmState = "not_supported"
	NgmStateNotStarted   NgmState = "not_started"
	NgmStateStarted      NgmState = "started"
)

const (
	ngmCacheTTL            = time.Second * 5
	ngmDashboardAuthHeader = "X-Ng-Monitoring-Dashboard-Token"
)

type ngmTarget struct {
	address            string
	dashboardAuthToken string
}

type ngmTargetCacheEntity struct {
	target  ngmTarget
	err     error
	cacheAt time.Time
}

type NgmProxy struct {
	lifecycleCtx   context.Context
	etcdClient     *clientv3.Client
	ngmReqGroup    singleflight.Group
	ngmTargetCache atomic.Value
	timeout        time.Duration
}

func NewNgmProxy(lc fx.Lifecycle, etcdClient *clientv3.Client, config *config.Config) (*NgmProxy, error) {
	s := &NgmProxy{
		etcdClient: etcdClient,
		timeout:    time.Duration(config.NgmTimeout) * time.Second,
	}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			s.lifecycleCtx = ctx
			return nil
		},
	})

	return s, nil
}

func (n *NgmProxy) Route(targetPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		target, err := n.getNgmTargetFromCache()
		if err != nil {
			rest.Error(c, err)
			return
		}

		c.Request.URL.Path = targetPath
		prepareNgmProxyRequest(c.Request, target.dashboardAuthToken)

		ngmURL, _ := url.Parse(target.address)
		proxy := httputil.NewSingleHostReverseProxy(ngmURL)
		proxy.ModifyResponse = n.modifyNgmResponse
		proxy.Transport = &http.Transport{
			Proxy: http.ProxyFromEnvironment,
			DialContext: defaultTransportDialContext(&net.Dialer{
				Timeout:   n.timeout,
				KeepAlive: n.timeout,
			}),
			ForceAttemptHTTP2:     true,
			MaxIdleConns:          100,
			IdleConnTimeout:       90 * time.Second,
			TLSHandshakeTimeout:   10 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
		}
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

func (n *NgmProxy) modifyNgmResponse(response *http.Response) error {
	if response.StatusCode == http.StatusUnauthorized {
		// A restarted ng-monitoring instance advertises a new token. Expire
		// the cached target so the next request immediately refreshes it.
		n.ngmTargetCache.Store(&ngmTargetCacheEntity{})

		// Do not expose an internal authentication failure as a Dashboard
		// authentication failure, which may cause clients to log users out.
		response.StatusCode = http.StatusBadGateway
		response.Status = fmt.Sprintf("%d %s", http.StatusBadGateway, http.StatusText(http.StatusBadGateway))
	}
	return nil
}

func prepareNgmProxyRequest(request *http.Request, token string) {
	// Dashboard authenticates and authorizes the caller before proxying the
	// request. Do not expose those credentials to another service.
	request.Header.Del("Authorization")

	// Never trust or forward a caller-supplied internal credential.
	request.Header.Del(ngmDashboardAuthHeader)
	if token != "" {
		request.Header.Set(ngmDashboardAuthHeader, token)
	}
}

func (n *NgmProxy) getNgmTargetFromCache() (ngmTarget, error) {
	fn := func() (ngmTarget, error) {
		// Check whether cache is valid, and use the cache if possible.
		if v := n.ngmTargetCache.Load(); v != nil {
			entity := v.(*ngmTargetCacheEntity)
			if entity.cacheAt.Add(ngmCacheTTL).After(time.Now()) {
				return entity.target, entity.err
			}
		}

		target, err := n.resolveNgmTarget()

		n.ngmTargetCache.Store(&ngmTargetCacheEntity{
			target:  target,
			err:     err,
			cacheAt: time.Now(),
		})

		return target, err
	}

	resolveResult, err, _ := n.ngmReqGroup.Do("any_key", func() (interface{}, error) {
		return fn()
	})
	return resolveResult.(ngmTarget), err
}

func (n *NgmProxy) resolveNgmTarget() (ngmTarget, error) {
	info, err := topology.FetchNgMonitoringTopologyInfo(n.lifecycleCtx, n.etcdClient)
	if err == nil && info != nil && info.Address != "" {
		return ngmTarget{
			address:            fmt.Sprintf("http://%s", info.Address),
			dashboardAuthToken: info.DashboardAuthToken,
		}, nil
	}
	return ngmTarget{}, ErrNgmNotStart.Wrap(err, "NgMonitoring component is not started")
}

func defaultTransportDialContext(dialer *net.Dialer) func(context.Context, string, string) (net.Conn, error) {
	return dialer.DialContext
}
