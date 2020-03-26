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

package apiserver

import (
	"context"
	"html/template"
	"io"
	"net/http"
	"sync"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	cors "github.com/rs/cors/wrapper/gin"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/clusterinfo"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/diagnose"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/foo"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/info"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/logsearch"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/profiling"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/statement"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	http2 "github.com/pingcap-incubator/tidb-dashboard/pkg/http"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual"
	keyvisualregion "github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
	utils2 "github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
)

func Handler(s *Service) http.Handler {
	return s.status.NewStatusAwareHandler(http.HandlerFunc(s.handler), s.stoppedHandler)
}

var (
	once sync.Once
)

type PDDataProviderConstructor func(*config.Config, *http.Client, *clientv3.Client) *keyvisualregion.PDDataProvider

type Service struct {
	app    *fx.App
	status *utils2.ServiceStatus

	ctx    context.Context
	cancel context.CancelFunc

	config            *config.Config
	newPDDataProvider PDDataProviderConstructor
	stoppedHandler    http.Handler

	apiHandlerEngine *gin.Engine
}

func NewService(cfg *config.Config, stoppedHandler http.Handler, newPDDataProvider PDDataProviderConstructor) *Service {
	once.Do(func() {
		// These global modification will be effective only for the first invoke.
		_ = godotenv.Load()
		gin.SetMode(gin.ReleaseMode)
	})

	return &Service{
		status:            utils2.NewServiceStatus(),
		config:            cfg,
		newPDDataProvider: newPDDataProvider,
		stoppedHandler:    stoppedHandler,
	}
}

func (s *Service) IsRunning() bool {
	return s.status.IsRunning()
}

func (s *Service) Start(ctx context.Context) error {
	if s.IsRunning() {
		return nil
	}

	s.ctx, s.cancel = context.WithCancel(ctx)

	s.app = fx.New(
		fx.Logger(utils2.NewFxPrinter()),
		fx.Provide(
			newAPIHandlerEngine,
			s.provideLocals,
			s.newPDDataProvider,
			dbstore.NewDBStore,
			pd.NewEtcdClient,
			tidb.NewForwarderConfig,
			tidb.NewForwarder,
			http2.NewHTTPClientWithConf,
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
			s.status.Register,
		),
	)

	if err := s.app.Err(); err != nil {
		return err
	}
	if err := s.app.Start(s.ctx); err != nil {
		return err
	}
	return nil
}

func (s *Service) Stop(ctx context.Context) error {
	if !s.IsRunning() {
		return nil
	}

	s.cancel()
	err := s.app.Stop(ctx)

	// drop
	s.app = nil
	s.apiHandlerEngine = nil
	s.ctx = nil
	s.cancel = nil

	return err
}

func (s *Service) NewStatusAwareHandler(handler http.Handler) http.Handler {
	return s.status.NewStatusAwareHandler(handler, s.stoppedHandler)
}

func (s *Service) handler(w http.ResponseWriter, r *http.Request) {
	s.apiHandlerEngine.ServeHTTP(w, r)
}

func (s *Service) provideLocals() *config.Config {
	return s.config
}

func newAPIHandlerEngine() (apiHandlerEngine *gin.Engine, endpoint *gin.RouterGroup, newTemplate utils2.NewTemplateFunc) {
	apiHandlerEngine = gin.New()
	apiHandlerEngine.Use(gin.Recovery())
	apiHandlerEngine.Use(cors.AllowAll())
	apiHandlerEngine.Use(gzip.Gzip(gzip.BestSpeed))
	apiHandlerEngine.Use(utils.MWHandleErrors())

	endpoint = apiHandlerEngine.Group("/dashboard/api")

	newTemplate = func(name string) *template.Template {
		return template.New(name).Funcs(apiHandlerEngine.FuncMap)
	}

	return
}

var StoppedHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)
	_, _ = io.WriteString(w, "Dashboard is not started.\n")
})
