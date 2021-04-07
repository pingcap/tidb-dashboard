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

package utils

import (
	"testing"

	"gopkg.in/go-playground/assert.v1"
)

type MyStruct struct {
	FirstField  string `matched:"first tag" value:"whatever"`
	SecondField string `matched:"second tag" value:"another whatever"`
}

func TestGetFieldTags_with_single_tag(t *testing.T) {
	rst, _ := GetFieldTags(MyStruct{}, struct {
		Matched string `tag:"matched"`
	}{})

	assert.Equal(t, rst, TagMap{
		"FirstField": map[string]string{
			"Matched": "first tag",
		},
		"SecondField": map[string]string{
			"Matched": "second tag",
		},
	})
}

func TestGetFieldTags_with_multi_tag(t *testing.T) {
	rst, _ := GetFieldTags(MyStruct{}, struct {
		Matched string `tag:"matched"`
		Desc    string `tag:"value"`
	}{})

	assert.Equal(t, rst, TagMap{
		"FirstField": map[string]string{
			"Matched": "first tag",
			"Desc":    "whatever",
		},
		"SecondField": map[string]string{
			"Matched": "second tag",
			"Desc":    "another whatever",
		},
	})
}

func TestGetFieldTags_with_undefined_tag(t *testing.T) {
	rst, _ := GetFieldTags(MyStruct{}, struct {
		Matched      string `tag:"matched"`
		Desc         string `tag:"value"`
		UndefinedTag string `tag:"undefined"`
		EmptyTag     string
	}{})

	assert.Equal(t, rst, TagMap{
		"FirstField": map[string]string{
			"Matched":      "first tag",
			"Desc":         "whatever",
			"UndefinedTag": "",
			"EmptyTag":     "",
		},
		"SecondField": map[string]string{
			"Matched":      "second tag",
			"Desc":         "another whatever",
			"UndefinedTag": "",
			"EmptyTag":     "",
		},
	})
}

func TestGetFieldTags_filter(t *testing.T) {
	rst, _ := GetFieldTags(MyStruct{}, struct {
		Matched string `tag:"matched"`
		Desc    string `tag:"value"`
	}{})
	rst = rst.Filter(func(k string, v map[string]string) bool {
		return k == "FirstField"
	})

	assert.Equal(t, rst, TagMap{
		"FirstField": map[string]string{
			"Matched": "first tag",
			"Desc":    "whatever",
		},
	})
}

// TODO: support nested struct
func TestGetFieldTags_with_nested_struct(t *testing.T) {}
