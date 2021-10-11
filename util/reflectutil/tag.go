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

package reflectutil

import (
	"reflect"
)

// GetFieldsAndTags return fields' tags assign by `tags` parameter
func GetFieldsAndTags(obj interface{}, tags []string) []Field {
	fieldTags := []Field{}
	t := reflect.TypeOf(obj)
	fNum := t.NumField()
	for i := 0; i < fNum; i++ {
		f := Field{Tags: map[string]string{}}
		structField := t.Field(i)

		f.Name = structField.Name
		for _, tagName := range tags {
			f.Tags[tagName] = structField.Tag.Get(tagName)
		}

		fieldTags = append(fieldTags, f)
	}

	return fieldTags
}

type Field struct {
	Name string
	Tags map[string]string
}
