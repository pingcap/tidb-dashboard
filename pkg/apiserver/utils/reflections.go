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
	"reflect"
	"strconv"
)

type StructTag reflect.StructTag

func (tag StructTag) Walk(fn func(tagName string, tagVal string)) {
	// When modifying this code, also update the validateStructTag code
	// in cmd/vet/structtag.go.

	for tag != "" {
		// Skip leading space.
		i := 0
		for i < len(tag) && tag[i] == ' ' {
			i++
		}
		tag = tag[i:]
		if tag == "" {
			break
		}

		// Scan to colon. A space, a quote or a control character is a syntax error.
		// Strictly speaking, control chars include the range [0x7f, 0x9f], not just
		// [0x00, 0x1f], but in practice, we ignore the multi-byte control characters
		// as it is simpler to inspect the tag's bytes than the tag's runes.
		i = 0
		for i < len(tag) && tag[i] > ' ' && tag[i] != ':' && tag[i] != '"' && tag[i] != 0x7f {
			i++
		}
		if i == 0 || i+1 >= len(tag) || tag[i] != ':' || tag[i+1] != '"' {
			break
		}
		name := string(tag[:i])
		tag = tag[i+1:]

		// Scan quoted string to find value.
		i = 1
		for i < len(tag) && tag[i] != '"' {
			if tag[i] == '\\' {
				i++
			}
			i++
		}
		if i >= len(tag) {
			break
		}
		qvalue := string(tag[:i+1])
		value, err := strconv.Unquote(qvalue)
		if err != nil {
			break
		}
		fn(name, value)

		tag = tag[i+1:]
	}
}

// GetFieldsAndTags return all fields' tags
func GetFieldsAndTags(obj interface{}) []FieldTags {
	fieldTags := []FieldTags{}
	t := reflect.TypeOf(obj)
	fNum := t.NumField()
	for i := 0; i < fNum; i++ {
		ft := newFieldTags()
		f := t.Field(i)
		tag := StructTag(f.Tag)

		ft.fieldName = f.Name
		tag.Walk(func(name string, val string) {
			ft.tags[name] = val
		})

		fieldTags = append(fieldTags, ft)
	}

	return fieldTags
}

type FieldTags struct {
	fieldName string
	tags      map[string]string
}

func newFieldTags() FieldTags {
	return FieldTags{tags: map[string]string{}}
}

func (m *FieldTags) FieldName() string {
	return m.fieldName
}

func (m *FieldTags) Tag(key string) string {
	return m.tags[key]
}

func (m *FieldTags) Tags() map[string]string {
	return m.tags
}
