// Copyright 2021 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package debugapi

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/thoas/go-funk"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/endpoint"
)

var APIParamModelText = endpoint.NewAPIParamModel("text")

var APIParamModelEscapeText = APIParamModelText.Copy().Use(func(p *endpoint.ModelParam, ctx *endpoint.Context) {
	p.SetValue(url.QueryEscape(p.Value()))
	ctx.Next()
})

var falselyValues = []string{"false", "0", "null", "undefined", ""}

var APIParamModelBool = endpoint.NewAPIParamModel("bool").Use(func(p *endpoint.ModelParam, ctx *endpoint.Context) {
	if funk.Contains(falselyValues, p.Value()) {
		p.SetValue("false")
	} else {
		p.SetValue("true")
	}
	ctx.Next()
})

var APIParamModelTags = endpoint.NewAPIParamModel("tags").Use(func(p *endpoint.ModelParam, ctx *endpoint.Context) {
	vals := strings.Split(p.Value(), ",")
	p.SetValues(funk.Map(vals, func(str string) string {
		v, _ := url.QueryUnescape(str)
		return v
	}).([]string))
	ctx.Next()
})

var APIParamModelInt = endpoint.NewAPIParamModel("int").Use(func(p *endpoint.ModelParam, ctx *endpoint.Context) {
	if _, err := strconv.Atoi(p.Value()); err != nil {
		ctx.Abort(fmt.Errorf("[%s] %s is not a number", p.Name(), p.Value()))
		return
	}
	ctx.Next()
})

// enum
type enumAPIParamModel struct {
	// we need use endpoint.BaseAPIParamModel point to avoid nested json struct
	*endpoint.BaseAPIParamModel
	Data []EnumItem `json:"data"`
}
type EnumItem struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

func APIParamModelEnum(items []EnumItem) endpoint.APIParamModel {
	items = funk.Map(items, func(item EnumItem) EnumItem {
		if item.Name == "" {
			item.Name = item.Value
		}
		return item
	}).([]EnumItem)
	enumModel := &enumAPIParamModel{endpoint.NewAPIParamModel("enum").(*endpoint.BaseAPIParamModel), items}
	enumModel.Use(func(p *endpoint.ModelParam, ctx *endpoint.Context) {
		isValid := funk.Contains(items, func(item EnumItem) bool {
			v := p.Value()
			return item.Value == v
		})
		if !isValid {
			ctx.Abort(fmt.Errorf("[%s] %s is not a valid value", p.Name(), p.Value()))
			return
		}
		ctx.Next()
	})
	return enumModel
}

// const
type constantAPIParamModel struct {
	// we need use endpoint.BaseAPIParamModel point to avoid nested json struct
	*endpoint.BaseAPIParamModel
	Data string `json:"data"`
}

func APIParamModelConstant(value string) endpoint.APIParamModel {
	m := &constantAPIParamModel{endpoint.NewAPIParamModel("constant").(*endpoint.BaseAPIParamModel), value}
	m.Use(func(p *endpoint.ModelParam, ctx *endpoint.Context) {
		p.SetValue(value)
		ctx.Next()
	})
	return m
}

var APIParamModelDB = endpoint.NewAPIParamModel("db")

var APIParamModelTable = endpoint.NewAPIParamModel("table")

var APIParamModelTableID = endpoint.NewAPIParamModel("table_id")
