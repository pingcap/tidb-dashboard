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

var APIParamModelText = &endpoint.BaseAPIParamModel{Type: "text"}

var APIParamModelEscapeText = &endpoint.BaseAPIParamModel{
	Type: "escape_text",
	OnResolve: func(v *endpoint.ResolvedValues) error {
		v.SetValue(url.QueryEscape(v.GetValue()))
		return nil
	},
}

var falselyValues = []string{"false", "0", "null", "undefined", ""}

var APIParamModelBool = &endpoint.BaseAPIParamModel{
	Type: "bool",
	OnResolve: func(v *endpoint.ResolvedValues) error {
		if funk.Contains(falselyValues, v.GetValue()) {
			v.SetValue("false")
		} else {
			v.SetValue("true")
		}
		return nil
	},
}

var APIParamModelMultiValue = &endpoint.BaseAPIParamModel{
	Type: "multi_value",
	OnResolve: func(v *endpoint.ResolvedValues) error {
		vals := strings.Split(v.GetValue(), ",")
		v.SetValues(funk.Map(vals, func(str string) string {
			v, _ := url.QueryUnescape(str)
			return v
		}).([]string))
		return nil
	},
}

var APIParamModelInt = &endpoint.BaseAPIParamModel{
	Type: "int",
	OnResolve: func(v *endpoint.ResolvedValues) error {
		if _, err := strconv.Atoi(v.GetValue()); err != nil {
			return fmt.Errorf("%s: %s is not a valid int value", v.Name(), v.GetValue())
		}
		return nil
	},
}

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
	enumModel := &enumAPIParamModel{
		&endpoint.BaseAPIParamModel{
			Type: "enum",
			OnResolve: func(v *endpoint.ResolvedValues) error {
				isValid := funk.Contains(items, func(item EnumItem) bool {
					v := v.GetValue()
					return item.Value == v
				})
				if !isValid {
					return fmt.Errorf("[%s] %s is not a valid value", v.Name(), v.GetValue())
				}
				return nil
			},
		},
		items,
	}
	return enumModel
}

// const
type constantAPIParamModel struct {
	// we need use endpoint.BaseAPIParamModel point to avoid nested json struct
	*endpoint.BaseAPIParamModel
	Data string `json:"data"`
}

func APIParamModelConstant(value string) endpoint.APIParamModel {
	m := &constantAPIParamModel{
		&endpoint.BaseAPIParamModel{
			Type: "constant",
			OnResolve: func(v *endpoint.ResolvedValues) error {
				v.SetValue(value)
				return nil
			},
		},
		value,
	}
	return m
}

var APIParamModelDB = &endpoint.BaseAPIParamModel{Type: "db"}

var APIParamModelTable = &endpoint.BaseAPIParamModel{Type: "table"}

var APIParamModelTableID = &endpoint.BaseAPIParamModel{Type: "table_id"}
