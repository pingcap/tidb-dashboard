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

package endpoint

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/thoas/go-funk"
)

var APIParamModelText = NewAPIParamModel("text")

var falselyValues = []string{"false", "0", "null", "undefined", ""}

var APIParamModelBool = NewAPIParamModel("bool").AddTransformer(func(ctx *Context) error {
	if funk.Contains(falselyValues, ctx.Value()) {
		ctx.SetValue("false")
	} else {
		ctx.SetValue("true")
	}
	return nil
})

var APIParamModelTags = NewAPIParamModel("tags").AddTransformer(func(ctx *Context) error {
	vals := strings.Split(ctx.Value(), ",")
	ctx.SetValues(funk.Map(vals, func(str string) string {
		v, _ := url.QueryUnescape(str)
		return v
	}).([]string))
	return nil
})

var APIParamModelInt = NewAPIParamModel("int").AddValidator(func(ctx *Context) error {
	if _, err := strconv.Atoi(ctx.Value()); err != nil {
		return fmt.Errorf("param not a number")
	}
	return nil
})

// enum
type enumAPIParamModel struct {
	BaseAPIParamModel
	Data []EnumItem `json:"data"`
}
type EnumItem struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

var apiParamModelEnum = NewAPIParamModel("enum")

func APIParamModelEnum(items []EnumItem) APIParamModel {
	items = funk.Map(items, func(item EnumItem) EnumItem {
		if item.Value == "" {
			item.Value = item.Name
		}
		return item
	}).([]EnumItem)
	enumModel := &enumAPIParamModel{*apiParamModelEnum, items}
	enumModel.AddValidator(func(ctx *Context) error {
		isValid := funk.Contains(items, func(item EnumItem) bool {
			v := ctx.Value()
			return item.Value == v
		})
		if !isValid {
			return fmt.Errorf("param is not a valid enum type, value: %s", ctx.Value())
		}
		return nil
	})
	return enumModel
}

// const
type constantAPIParamModel struct {
	*BaseAPIParamModel
	Data string `json:"data"`
}

var apiParamModelConstant = NewAPIParamModel("constant")

func APIParamModelConstant(value string) APIParamModel {
	m := &constantAPIParamModel{apiParamModelConstant, value}
	m.AddTransformer(func(ctx *Context) error {
		ctx.SetValue(value)
		return nil
	})
	return m
}

var APIParamModelDB = NewAPIParamModel("db")

var APIParamModelTable = NewAPIParamModel("table")

var APIParamModelTableID = NewAPIParamModel("table_id")
