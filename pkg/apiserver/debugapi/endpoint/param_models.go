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

var APIParamModelText APIParamModel = APIParamModel{
	Type: "text",
}

var APIParamModelMultiTags APIParamModel = APIParamModel{
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

var APIParamModelInt APIParamModel = APIParamModel{
	Type: "int",
	Transformer: func(ctx *Context) error {
		if _, err := strconv.Atoi(ctx.Value()); err != nil {
			return fmt.Errorf("param should be a number")
		}
		return nil
	},
}

type EnumItem struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

func CreateAPIParamModelEnum(items []EnumItem) APIParamModel {
	items = funk.Map(items, func(item EnumItem) EnumItem {
		if item.Value == "" {
			item.Value = item.Name
		}
		return item
	}).([]EnumItem)
	return APIParamModel{
		Type: "enum",
		Data: items,
	}
}

var APIParamModelDB APIParamModel = APIParamModel{
	Type: "db",
}

var APIParamModelTable APIParamModel = APIParamModel{
	Type: "table",
}

var APIParamModelTableID APIParamModel = APIParamModel{
	Type: "table_id",
}
