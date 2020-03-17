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
	"sync"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	cors "github.com/rs/cors/wrapper/gin"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	utils2 "github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
)

var once sync.Once

func NewAPIHandlerEngine(apiPrefix string) (r *gin.Engine, endpoint *gin.RouterGroup, newTemplate utils2.NewTemplateFunc) {
	once.Do(func() {
		// These global modification will be effective only for the first invoke.
		gin.SetMode(gin.ReleaseMode)
	})

	r = gin.New()
	r.Use(cors.AllowAll())
	r.Use(gzip.Gzip(gzip.BestSpeed))
	r.Use(utils.MWHandleErrors())

	endpoint = r.Group(apiPrefix)

	newTemplate = func(name string) *template.Template {
		return template.New(name).Funcs(r.FuncMap)
	}

	return
}
