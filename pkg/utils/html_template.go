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
	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/render"
)

type TemplateInfo struct {
	Name string
	Text string
}

func HTML(c *gin.Context, r render.HTMLRender, code int, name string, obj interface{}) {
	instance := r.Instance(name, obj)
	c.Render(code, instance)
}
