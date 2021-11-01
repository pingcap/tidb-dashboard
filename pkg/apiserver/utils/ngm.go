// Copyright 2021 Suhaha
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"golang.org/x/sync/singleflight"
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

type NgmProxy struct {
	lifecycleCtx          context.Context
	etcdClient            *clientv3.Client
	ngMonitoringReqGroup  singleflight.Group
	ngMonitoringAddrCache atomic.Value
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

func (s *NgmProxy) Route(targetPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ngMonitoringAddr, err := s.getNgMonitoringAddrFromCache()
		if err != nil {
			_ = c.Error(err)
			return
		}

		c.Request.URL.Path = targetPath
		token := c.Query("token")
		if token != "" {
			queryStr, err := ParseJWTString("conprof", token)
			if err != nil {
				MakeInvalidRequestErrorFromError(c, err)
				return
			}
			c.Request.URL.RawQuery = queryStr
		}

		ngMonitoringURL, _ := url.Parse(ngMonitoringAddr)
		proxy := httputil.NewSingleHostReverseProxy(ngMonitoringURL)
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

func (s *NgmProxy) getNgMonitoringAddrFromCache() (string, error) {
	fn := func() (string, error) {
		// Check whether cache is valid, and use the cache if possible.
		if v := s.ngMonitoringAddrCache.Load(); v != nil {
			entity := v.(*ngMonitoringAddrCacheEntity)
			if entity.cacheAt.Add(ngMonitoringCacheTTL).After(time.Now()) {
				return entity.address, entity.err
			}
		}

		addr, err := s.resolveNgMonitoringAddress()

		s.ngMonitoringAddrCache.Store(&ngMonitoringAddrCacheEntity{
			address: addr,
			err:     err,
			cacheAt: time.Now(),
		})

		return addr, err
	}

	resolveResult, err, _ := s.ngMonitoringReqGroup.Do("any_key", func() (interface{}, error) {
		return fn()
	})
	return resolveResult.(string), err
}

func (s *NgmProxy) resolveNgMonitoringAddress() (string, error) {
	pi, err := topology.FetchPrometheusTopology(s.lifecycleCtx, s.etcdClient)
	if pi == nil || err != nil {
		return "", ErrNgMonitoringNotDeploy.Wrap(err, "NgMonitoring component is not deployed")
	}

	addr, err := topology.FetchNgMonitoringTopology(s.lifecycleCtx, s.etcdClient)
	if err == nil && addr != "" {
		return fmt.Sprintf("http://%s", addr), nil
	}
	return "", ErrNgMonitoringNotStart.Wrap(err, "NgMonitoring component is not started")
}
