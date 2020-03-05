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

package utils

import (
	"html/template"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/render"
	"github.com/pingcap/log"
	"go.uber.org/zap"
)

type TemplateInfo struct {
	Name string
	Text string
}

func NewHTMLRender(templ *template.Template, infos []TemplateInfo) render.HTMLRender {
	for _, info := range infos {
		t := templ.New(info.Name)
		if _, err := t.Parse(info.Text); err != nil {
			log.Fatal("Failed to parse template", zap.String("name", info.Name), zap.Error(err))
		}
	}
	return render.HTMLProduction{Template: templ}
}

func HTML(c *gin.Context, r render.HTMLRender, code int, name string, obj interface{}) {
	instance := r.Instance(name, obj)
	c.Render(code, instance)
}
