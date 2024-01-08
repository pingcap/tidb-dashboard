// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package reflectutil

import (
	"reflect"
)

// GetFieldsAndTags return fields' tags assign by `tags` parameter.
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
