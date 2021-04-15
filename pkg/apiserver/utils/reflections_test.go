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

	"github.com/stretchr/testify/assert"
)

type MyStruct struct {
	FirstField  string `matched:"first tag" value:"whatever"`
	SecondField string `matched:"second tag" value:"another whatever"`
}

func TestGetFieldTags(t *testing.T) {
	rst := GetFieldsAndTags(MyStruct{}, []string{"matched", "value"})

	assert.Equal(t, rst, []Field{
		{
			Name: "FirstField",
			Tags: map[string]string{
				"matched": "first tag",
				"value":   "whatever",
			},
		},
		{

			Name: "SecondField",
			Tags: map[string]string{
				"matched": "second tag",
				"value":   "another whatever",
			},
		},
	})
}

// // TODO: support nested struct
// func TestGetFieldTags_with_nested_struct(t *testing.T) {}
