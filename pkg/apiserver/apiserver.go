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
	"html/template"
	"net/http"
	"sync"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"

	cors "github.com/rs/cors/wrapper/gin"

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
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
)

var once sync.Once

type Services struct {
	Store         *dbstore.DB
	TiDBForwarder *tidb.Forwarder
	KeyVisual     *keyvisual.Service
	EtcdProvider  pd.EtcdProvider
	HTTPClient    *http.Client
}

func Handler(apiPrefix string, config *config.Config, services *Services) http.Handler {
	once.Do(func() {
		// These global modification will be effective only for the first invoke.
		gin.SetMode(gin.ReleaseMode)
	})

	r := gin.New()
	r.Use(cors.AllowAll())
	r.Use(gin.Recovery())
	r.Use(gzip.Gzip(gzip.BestSpeed))
	r.Use(utils.MWHandleErrors())

	endpoint := r.Group(apiPrefix)

	auth := user.NewAuthService(services.TiDBForwarder)
	auth.Register(endpoint)

	foo.NewService(config).Register(endpoint, auth)
	info.NewService(config, services.TiDBForwarder, services.Store).Register(endpoint, auth)
	clusterinfo.NewService(config, services.EtcdProvider, services.HTTPClient).Register(endpoint, auth)
	profiling.NewService(config, services.Store).Register(endpoint)
	services.KeyVisual.Register(endpoint, auth)
	logsearch.NewService(config, services.Store).Register(endpoint, auth)
	statement.NewService(config, services.TiDBForwarder).Register(endpoint, auth)
	diagnose.NewService(config, services.TiDBForwarder, services.Store, NewTemplate(r, "diagnose")).Register(endpoint, auth)

	return r
}

func NewTemplate(r *gin.Engine, name string) *template.Template {
	return template.New(name).Funcs(r.FuncMap)
}
