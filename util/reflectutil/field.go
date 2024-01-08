// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package reflectutil

import "reflect"

// See https://cs.opensource.google/go/go/+/refs/tags/go1.17.1:src/reflect/type.go;l=619
func IsFieldExported(field reflect.StructField) bool {
	return field.PkgPath == ""
}
