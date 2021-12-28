// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package utils

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
)

var (
	NgmErrNS       = errorx.NewNamespace("ngm")
	ErrNgmNotStart = NgmErrNS.NewType("ngm_not_started")
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
}

func NewNgmProxy(lc fx.Lifecycle, etcdClient *clientv3.Client) (*NgmProxy, error) {
	s := &NgmProxy{etcdClient: etcdClient}
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
			_ = c.Error(err)
			return
		}

		c.Request.URL.Path = targetPath

		ngmURL, _ := url.Parse(ngmAddr)
		proxy := httputil.NewSingleHostReverseProxy(ngmURL)
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
