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

var APIParamModelEscapeText = APIParamModelText.Copy().Use(func(p *ModelParam) error {
	p.SetValue(url.QueryEscape(p.Value()))
	return nil
})

var falselyValues = []string{"false", "0", "null", "undefined", ""}

var APIParamModelBool = NewAPIParamModel("bool").Use(func(p *ModelParam) error {
	if funk.Contains(falselyValues, p.Value()) {
		p.SetValue("false")
	} else {
		p.SetValue("true")
	}
	return nil
})

var APIParamModelTags = NewAPIParamModel("tags").Use(func(p *ModelParam) error {
	vals := strings.Split(p.Value(), ",")
	p.SetValues(funk.Map(vals, func(str string) string {
		v, _ := url.QueryUnescape(str)
		return v
	}).([]string))
	return nil
})

var APIParamModelInt = NewAPIParamModel("int").Use(func(p *ModelParam) error {
	if _, err := strconv.Atoi(p.Value()); err != nil {
		return fmt.Errorf("[%s] %s is not a number", p.Name(), p.Value())
	}
	return nil
})

// enum
type enumAPIParamModel struct {
	APIParamModel
	Data []EnumItem `json:"data"`
}
type EnumItem struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

func APIParamModelEnum(items []EnumItem) APIParamModel {
	items = funk.Map(items, func(item EnumItem) EnumItem {
		if item.Value == "" {
			panic("enum item requires a valid value")
		}
		if item.Name == "" {
			item.Name = item.Value
		}
		return item
	}).([]EnumItem)
	enumModel := &enumAPIParamModel{NewAPIParamModel("enum"), items}
	enumModel.Use(func(p *ModelParam) error {
		isValid := funk.Contains(items, func(item EnumItem) bool {
			v := p.Value()
			return item.Value == v
		})
		if !isValid {
			return fmt.Errorf("[%s] %s is not a valid value", p.Name(), p.Value())
		}
		return nil
	})
	return enumModel
}

// const
type constantAPIParamModel struct {
	APIParamModel
	Data string `json:"data"`
}

func APIParamModelConstant(value string) APIParamModel {
	m := &constantAPIParamModel{NewAPIParamModel("constant"), value}
	m.Use(func(p *ModelParam) error {
		p.SetValue(value)
		return nil
	})
	return m
}

var APIParamModelDB = NewAPIParamModel("db")

var APIParamModelTable = NewAPIParamModel("table")

var APIParamModelTableID = NewAPIParamModel("table_id")
