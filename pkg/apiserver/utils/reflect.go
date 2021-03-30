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

import "reflect"

type callbackFn func(f reflect.StructField)

func ForEachField(s interface{}, fn callbackFn) {
	t := reflect.TypeOf(s)
	num := t.NumField()
	for i := 0; i < num; i++ {
		f := t.Field(i)
		fn(f)
	}
}
