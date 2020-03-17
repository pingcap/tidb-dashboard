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

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/joomcode/errorx"
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
)

type PDDataProviderConstructor func(*config.Config, *http.Client, pd.EtcdProvider) *keyvisualregion.PDDataProvider

type App struct {
	app    *fx.App
	status *utils.AppStatus

	config            *config.Config
	newPDDataProvider PDDataProviderConstructor

	apiHandlerEngine *gin.Engine

	http.Handler
}

func NewApp(cfg *config.Config, uiHandler, swaggerHandler http.Handler, stoppedHandler gin.HandlerFunc, newPDDataProvider PDDataProviderConstructor) *App {
	_ = godotenv.Load()

	a := &App{
		status:            utils.NewAppStatus(),
		config:            cfg,
		newPDDataProvider: newPDDataProvider,
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
		a.apiHandlerEngine.ServeHTTP(w, r)
	}))

	// global Handler
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(a.status.MWHandleStopped(stoppedHandler))
	r.Any("/dashboard", gin.WrapH(mux))
	a.Handler = r

	return a
}

func (a *App) Start(ctx context.Context) error {
	a.app = fx.New(
		fx.Logger(utils.NewFxPrinter()),
		fx.Provide(
			dbstore.MustOpenDBStore,
			pd.NewLocalEtcdClientProvider,
			tidb.NewForwarderConfig,
			tidb.NewForwarder,
			http2.NewHTTPClientWithConf,
			a.newPDDataProvider,
			a.NewApiHandlerEngine,
			user.NewAuthService,
			foo.NewService,
			info.NewService,
			clusterinfo.NewService,
			profiling.NewService,
			logsearch.NewService,
			statement.NewService,
			diagnose.NewService,
			// app
			keyvisual.NewApp,
		),
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
		),
		fx.Populate(&a.apiHandlerEngine),
	)

	if err := a.app.Err(); err != nil {
		return err
	}
	if err := a.app.Start(ctx); err != nil {
		return err
	}
	return nil
}

func (a *App) Stop(ctx context.Context) error {
	err := a.app.Stop(ctx)
	a.apiHandlerEngine = nil
	return err
}

func (a *App) Parameters() *config.Config {
	return a.config
}

func (a *App) NewApiHandlerEngine() (r *gin.Engine, endpoint *gin.RouterGroup, newTemplate utils.NewTemplateFunc) {
	return apiserver.NewApiHandlerEngine("/dashboard/api")
}

func StoppedHandler(c *gin.Context) {
	_ = c.AbortWithError(http.StatusNotFound, ErrServiceStopped.NewWithNoMessage())
}
