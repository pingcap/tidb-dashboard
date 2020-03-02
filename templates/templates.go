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

package templates

import (
	"html/template"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/templates/sqldiagnosis"
)

const (
	DelimsLeft  = "{{"
	DelimsRight = "}}"
)

var DefinedTemplates = [][]string{
	{"sql-diagnosis/index", sqldiagnosis.Index},
	{"sql-diagnosis/table", sqldiagnosis.Table},
}

func GinLoad(r *gin.Engine) {
	r.Delims(DelimsLeft, DelimsRight)
	templ := template.New("").Delims(DelimsLeft, DelimsRight).Funcs(r.FuncMap)
	for _, info := range DefinedTemplates {
		name := info[0]
		text := info[1]
		t := templ.New(name)
		if _, err := t.Parse(text); err != nil {
			log.Fatal("Failed to parse template", zap.String("name", name), zap.Error(err))
		}
	}
	r.SetHTMLTemplate(templ)
}
