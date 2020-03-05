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
	"io/ioutil"
	"os"

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

type TemplateInfoWithFilename struct {
	Name     string
	Text     string
	Filename string
}

func (info TemplateInfoWithFilename) loadContext() string {
	if fileExists(info.Filename) {
		data, err := ioutil.ReadFile(info.Filename)
		if err != nil {
			log.Fatal("Failed to load template from file", zap.String("filename", info.Filename), zap.Error(err))
		}
		return string(data)
	}
	return info.Text
}

func fileExists(filename string) bool {
	stat, err := os.Stat(filename)
	if os.IsNotExist(err) {
		return false
	}
	return !stat.IsDir()
}

func NewPreferLocalFileHTMLRender(infos []TemplateInfoWithFilename) render.HTMLRender {
	return PreferLocalFileHTMLProduction{backend: buildBackend(infos), Infos: infos}
}

type PreferLocalFileHTMLProduction struct {
	Infos   []TemplateInfoWithFilename
	backend *render.HTMLProduction
}

func (r PreferLocalFileHTMLProduction) Instance(name string, data interface{}) render.Render {
	if r.shouldLoadFromFile() {
		return buildBackend(r.Infos).Instance(name, data)
	}
	return r.backend.Instance(name, data)
}

func (r *PreferLocalFileHTMLProduction) shouldLoadFromFile() bool {
	return r.backend == nil || r.anyFileExists()
}

func (r *PreferLocalFileHTMLProduction) anyFileExists() bool {
	for _, info := range r.Infos {
		if fileExists(info.Filename) {
			return true
		}
	}
	return false
}

// Re-create template every time with hot-swap feature.
func buildBackend(infos []TemplateInfoWithFilename) *render.HTMLProduction {
	templ := template.New("")
	for _, info := range infos {
		t := templ.New(info.Name)
		if _, err := t.Parse(info.loadContext()); err != nil {
			log.Fatal("Failed to parse template", zap.String("name", info.Name), zap.Error(err))
		}
	}
	return &render.HTMLProduction{Template: templ}
}
