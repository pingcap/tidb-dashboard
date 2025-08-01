// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package region

import (
	"reflect"
	"unsafe"
)

// String converts slice of bytes to string without copy.
func String(b []byte) (s string) {
	if len(b) == 0 {
		return ""
	}
	pbytes := (*reflect.SliceHeader)(unsafe.Pointer(&b))   // #nosec
	pstring := (*reflect.StringHeader)(unsafe.Pointer(&s)) // #nosec
	pstring.Data = pbytes.Data
	pstring.Len = pbytes.Len
	return
}

// Bytes converts a string into a byte slice. Need to make sure that the byte slice is not modified.
func Bytes(s string) (b []byte) {
	if len(s) == 0 {
		return
	}
	pbytes := (*reflect.SliceHeader)(unsafe.Pointer(&b))   // #nosec
	pstring := (*reflect.StringHeader)(unsafe.Pointer(&s)) // #nosec
	pbytes.Data = pstring.Data
	pbytes.Len = pstring.Len
	pbytes.Cap = pstring.Len
	return
}
