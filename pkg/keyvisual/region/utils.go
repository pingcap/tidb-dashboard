// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package region

import (
	"unsafe"
)

// String converts slice of bytes to string without copy.
func String(b []byte) string {
	if len(b) == 0 {
		return ""
	}
	return unsafe.String(&b[0], len(b)) // #nosec
}

// Bytes converts a string into a byte slice. Need to make sure that the byte slice is not modified.
func Bytes(s string) []byte {
	if len(s) == 0 {
		return nil
	}
	return unsafe.Slice(unsafe.StringData(s), len(s)) // #nosec
}
