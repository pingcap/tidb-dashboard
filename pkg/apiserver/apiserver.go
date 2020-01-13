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
	"net/http"
	"sync"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/foo"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/info"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/logs"
)

var once sync.Once

func Handler(apiPrefix string, config *config.Config) http.Handler {
	once.Do(func() {
		// These global modification will be effective only for the first invoke.
		gin.SetMode(gin.ReleaseMode)
	})

	r := gin.New()
	r.Use(cors.Default())
	r.Use(gin.Recovery())
	endpoint := r.Group(apiPrefix)

	foo.NewService(config).Register(endpoint)
	info.NewService(config).Register(endpoint)
	logs.RegisterService(endpoint)

	return r
}
