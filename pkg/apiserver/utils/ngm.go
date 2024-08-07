// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

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
	ngmCacheTTL = time.Second * 5
)

type ngmAddrCacheEntity struct {
	address string
	err     error
	cacheAt time.Time
}

type NgmProxy struct {
	lifecycleCtx context.Context
	etcdClient   *clientv3.Client
	ngmReqGroup  singleflight.Group
	ngmAddrCache atomic.Value
	timeout      time.Duration
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
		ngmAddr, err := n.getNgmAddrFromCache()
		if err != nil {
			rest.Error(c, err)
			return
		}

		c.Request.URL.Path = targetPath

		ngmURL, _ := url.Parse(ngmAddr)
		proxy := httputil.NewSingleHostReverseProxy(ngmURL)
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

func (n *NgmProxy) getNgmAddrFromCache() (string, error) {
	fn := func() (string, error) {
		// Check whether cache is valid, and use the cache if possible.
		if v := n.ngmAddrCache.Load(); v != nil {
			entity := v.(*ngmAddrCacheEntity)
			if entity.cacheAt.Add(ngmCacheTTL).After(time.Now()) {
				return entity.address, entity.err
			}
		}

		addr, err := n.resolveNgmAddress()

		n.ngmAddrCache.Store(&ngmAddrCacheEntity{
			address: addr,
			err:     err,
			cacheAt: time.Now(),
		})

		return addr, err
	}

	resolveResult, err, _ := n.ngmReqGroup.Do("any_key", func() (interface{}, error) {
		return fn()
	})
	return resolveResult.(string), err
}

func (n *NgmProxy) resolveNgmAddress() (string, error) {
	addr, err := topology.FetchNgMonitoringTopology(n.lifecycleCtx, n.etcdClient)
	if err == nil && addr != "" {
		return fmt.Sprintf("http://%s", addr), nil
	}
	return "", ErrNgmNotStart.Wrap(err, "NgMonitoring component is not started")
}

func defaultTransportDialContext(dialer *net.Dialer) func(context.Context, string, string) (net.Conn, error) {
	return dialer.DialContext
}
