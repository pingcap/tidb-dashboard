// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package server

import (
	"context"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/joomcode/errorx"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/clusterinfo"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/diagnose"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/foo"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/info"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/logsearch"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/profiling"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/statement"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	http2 "github.com/pingcap-incubator/tidb-dashboard/pkg/http"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual"
	keyvisualregion "github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
)

var (
	ErrNS             = errorx.NewNamespace("error.server")
	ErrServiceStopped = ErrNS.NewType("service_stopped")

	once sync.Once
)

type PDDataProviderConstructor func(*config.Config, *http.Client, *clientv3.Client) *keyvisualregion.PDDataProvider

type Service struct {
	app    *fx.App
	status *utils.ServiceStatus

	config            *config.Config
	newPDDataProvider PDDataProviderConstructor
	stoppedHandler    gin.HandlerFunc

	apiHandlerEngine *gin.Engine

	core http.Handler
}

func NewService(cfg *config.Config, uiHandler, swaggerHandler http.Handler, stoppedHandler gin.HandlerFunc, newPDDataProvider PDDataProviderConstructor) *Service {
	once.Do(func() {
		// These global modification will be effective only for the first invoke.
		_ = godotenv.Load()
		gin.SetMode(gin.ReleaseMode)
	})

	s := &Service{
		status:            utils.NewServiceStatus(),
		config:            cfg,
		newPDDataProvider: newPDDataProvider,
		stoppedHandler:    stoppedHandler,
	}

	// handle ui, api, swagger
	mux := http.NewServeMux()
	if uiHandler != nil {
		mux.Handle("/dashboard/", http.StripPrefix("/dashboard", uiHandler))
	}
	if swaggerHandler != nil {
		mux.Handle("/dashboard/api/swagger/", swaggerHandler)
	}
	mux.Handle("/dashboard/api/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.apiHandlerEngine.ServeHTTP(w, r)
	}))

	s.core = mux

	return s
}

func Register(r *gin.RouterGroup, s *Service) {
	r.Use(s.status.MWHandleStopped(s.stoppedHandler))
	r.Any("/*any", gin.WrapH(s.core))
}

func (s *Service) IsRunning() bool {
	return s.status.IsRunning()
}

func (s *Service) StartSupportTask(ctx context.Context) error {
	s.app = fx.New(
		fx.Logger(utils.NewFxPrinter()),
		fx.Provide(
			s.Parameters,
			dbstore.MustOpenDBStore,
			pd.NewEtcdClient,
			tidb.NewForwarderConfig,
			tidb.NewForwarder,
			http2.NewHTTPClientWithConf,
			s.newPDDataProvider,
			s.NewAPIHandlerEngine,
			user.NewAuthService,
			foo.NewService,
			info.NewService,
			clusterinfo.NewService,
			profiling.NewService,
			logsearch.NewService,
			statement.NewService,
			diagnose.NewService,
			keyvisual.NewService,
		),
		fx.Populate(&s.apiHandlerEngine),
		fx.Invoke(
			user.Register,
			foo.Register,
			info.Register,
			clusterinfo.Register,
			profiling.Register,
			logsearch.Register,
			statement.Register,
			diagnose.Register,
			keyvisual.Register,
			// Must be at the end
			func(lc fx.Lifecycle) {
				lc.Append(fx.Hook{
					OnStart: func(context.Context) error {
						s.status.Start()
						return nil
					},
					OnStop: func(context.Context) error {
						s.status.Stop()
						return nil
					},
				})
			},
		),
	)

	if err := s.app.Err(); err != nil {
		return err
	}
	if err := s.app.Start(ctx); err != nil {
		return err
	}
	return nil
}

func (s *Service) StopSupportTask(ctx context.Context) error {
	err := s.app.Stop(ctx)
	s.apiHandlerEngine = nil
	return err
}

func (s *Service) Parameters() *config.Config {
	return s.config
}

func (s *Service) NewAPIHandlerEngine() (r *gin.Engine, endpoint *gin.RouterGroup, newTemplate utils.NewTemplateFunc) {
	return apiserver.NewAPIHandlerEngine("/dashboard/api")
}

func StoppedHandler(c *gin.Context) {
	_ = c.AbortWithError(http.StatusNotFound, ErrServiceStopped.NewWithNoMessage())
}
