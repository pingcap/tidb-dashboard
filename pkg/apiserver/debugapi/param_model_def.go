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
	OnResolve: func(value string) ([]string, error) {
		return []string{url.QueryEscape(value)}, nil
	},
}

var falselyValues = []string{"false", "0", "null", "undefined", ""}

var APIParamModelBool = &endpoint.BaseAPIParamModel{
	Type: "bool",
	OnResolve: func(value string) ([]string, error) {
		for _, falselyValue := range falselyValues {
			if falselyValue == value {
				return []string{"false"}, nil
			}
		}
		return []string{"true"}, nil
	},
}

var APIParamModelMultiValue = &endpoint.BaseAPIParamModel{
	Type: "multi_value",
	OnResolve: func(value string) ([]string, error) {
		return strings.Split(value, ","), nil
	},
}

var APIParamModelInt = &endpoint.BaseAPIParamModel{
	Type: "int",
	OnResolve: func(value string) ([]string, error) {
		if _, err := strconv.Atoi(value); err != nil {
			return nil, fmt.Errorf("%s is not a valid int value", value)
		}
		return []string{value}, nil
	},
}

// enum.
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
			OnResolve: func(value string) ([]string, error) {
				for _, item := range items {
					if item.Value == value {
						return []string{value}, nil
					}
				}
				return nil, fmt.Errorf("%s is not a valid enum value", value)
			},
		},
		items,
	}
	return enumModel
}

// const.
type constantAPIParamModel struct {
	// we need use endpoint.BaseAPIParamModel point to avoid nested json struct
	*endpoint.BaseAPIParamModel
	Data string `json:"data"`
}

func APIParamModelConstant(value string) endpoint.APIParamModel {
	m := &constantAPIParamModel{
		&endpoint.BaseAPIParamModel{
			Type: "constant",
			OnResolve: func(_ string) ([]string, error) {
				return []string{value}, nil
			},
		},
		value,
	}
	return m
}

var APIParamModelDB = &endpoint.BaseAPIParamModel{Type: "db"}

var APIParamModelTable = &endpoint.BaseAPIParamModel{Type: "table"}

var APIParamModelTableID = &endpoint.BaseAPIParamModel{Type: "table_id"}
