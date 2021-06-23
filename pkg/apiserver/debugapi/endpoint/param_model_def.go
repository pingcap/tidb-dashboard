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
// See the License for the specific language governing permissions and
// limitations under the License.

package endpoint

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/thoas/go-funk"
)

type DefaultAPIParamModel struct {
	Type           string           `json:"type"`
	PreTransformer ModelTransformer `json:"-"`
	Transformer    ModelTransformer `json:"-"`
}

func (m *DefaultAPIParamModel) PreTransform(ctx *Context) error {
	if m.PreTransformer != nil {
		return m.PreTransformer(ctx)
	}
	return nil
}

func (m *DefaultAPIParamModel) Transform(ctx *Context) error {
	if m.Transformer != nil {
		return m.Transformer(ctx)
	}
	return nil
}

var _ APIParamModel = (*DefaultAPIParamModel)(nil)

var APIParamModelText = &DefaultAPIParamModel{
	Type: "text",
}

var APIParamModelBool = &DefaultAPIParamModel{
	Type: "bool",
}

var APIParamModelMultiTags = &DefaultAPIParamModel{
	Type: "tags",
	Transformer: func(ctx *Context) error {
		vals := strings.Split(ctx.Value(), ",")
		ctx.SetValues(funk.Map(vals, func(str string) string {
			v, _ := url.QueryUnescape(str)
			return v
		}).([]string))
		return nil
	},
}

var APIParamModelInt = &DefaultAPIParamModel{
	Type: "int",
	Transformer: func(ctx *Context) error {
		if _, err := strconv.Atoi(ctx.Value()); err != nil {
			return fmt.Errorf("param should be a number")
		}
		return nil
	},
}

type EnumAPIParamModel struct {
	DefaultAPIParamModel
	Data []EnumItem `json:"data"`
}

type EnumItem struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

func CreateAPIParamModelEnum(items []EnumItem) *EnumAPIParamModel {
	items = funk.Map(items, func(item EnumItem) EnumItem {
		if item.Value == "" {
			item.Value = item.Name
		}
		return item
	}).([]EnumItem)
	return &EnumAPIParamModel{
		DefaultAPIParamModel{
			Type: "enum",
		},
		items,
	}
}

type ConstantAPIParamModel struct {
	DefaultAPIParamModel
	Data string `json:"data"`
}

func CreateAPIParamModelConstant(constVal string) *ConstantAPIParamModel {
	return &ConstantAPIParamModel{
		DefaultAPIParamModel{
			Type: "constant",
			PreTransformer: func(ctx *Context) error {
				ctx.SetValue(constVal)
				return nil
			},
		},
		constVal,
	}
}

var APIParamModelDB = &DefaultAPIParamModel{
	Type: "db",
}

var APIParamModelTable = &DefaultAPIParamModel{
	Type: "table",
}

var APIParamModelTableID = &DefaultAPIParamModel{
	Type: "table_id",
}
