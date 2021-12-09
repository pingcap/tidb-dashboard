// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package ngmclient

import (
	"context"
	"fmt"
	"net/http/httputil"
	"net/url"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"golang.org/x/sync/singleflight"

	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

var (
	NgmErrNS                 = errorx.NewNamespace("error.api.ng_monitoring")
	ErrNgMonitoringNotDeploy = NgmErrNS.NewType("not_deploy")
	ErrNgMonitoringNotStart  = NgmErrNS.NewType("not_start")
)

const (
	ngMonitoringCacheTTL = time.Second * 5
)

type ngMonitoringAddrCacheEntity struct {
	address string
	err     error
	cacheAt time.Time
}

type NgmClient struct {
	lifecycleCtx          context.Context
	etcdClient            *clientv3.Client
	ngMonitoringReqGroup  singleflight.Group
	ngMonitoringAddrCache atomic.Value
}

func NewNgmClient(lc fx.Lifecycle, etcdClient *clientv3.Client) (*NgmClient, error) {
	nc := &NgmClient{etcdClient: etcdClient}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			nc.lifecycleCtx = ctx
			return nil
		},
	})

	return nc, nil
}

func (nc *NgmClient) Route(targetPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ngMonitoringAddr, err := nc.getNgMonitoringAddrFromCache()
		if err != nil {
			_ = c.Error(err)
			return
		}

		c.Request.URL.Path = targetPath

		ngMonitoringURL, _ := url.Parse(ngMonitoringAddr)
		proxy := httputil.NewSingleHostReverseProxy(ngMonitoringURL)
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

func (nc *NgmClient) getNgMonitoringAddrFromCache() (string, error) {
	fn := func() (string, error) {
		// Check whether cache is valid, and use the cache if possible.
		if v := nc.ngMonitoringAddrCache.Load(); v != nil {
			entity := v.(*ngMonitoringAddrCacheEntity)
			if entity.cacheAt.Add(ngMonitoringCacheTTL).After(time.Now()) {
				return entity.address, entity.err
			}
		}

		addr, err := nc.resolveNgMonitoringAddress()

		nc.ngMonitoringAddrCache.Store(&ngMonitoringAddrCacheEntity{
			address: addr,
			err:     err,
			cacheAt: time.Now(),
		})

		return addr, err
	}

	resolveResult, err, _ := nc.ngMonitoringReqGroup.Do("any_key", func() (interface{}, error) {
		return fn()
	})
	return resolveResult.(string), err
}

func (nc *NgmClient) resolveNgMonitoringAddress() (string, error) {
	pi, err := topology.FetchPrometheusTopology(nc.lifecycleCtx, nc.etcdClient)
	if pi == nil || err != nil {
		return "", ErrNgMonitoringNotDeploy.Wrap(err, "NgMonitoring component is not deployed")
	}

	addr, err := topo.FetchNgMonitoringTopology(nc.lifecycleCtx, nc.etcdClient)
	if err == nil && addr != "" {
		return fmt.Sprintf("http://%s", addr), nil
	}
	return "", ErrNgMonitoringNotStart.Wrap(err, "NgMonitoring component is not started")
}
