// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Copyright (c) 2017 Eason Lin

package jsonserde

import (
	"unicode"
)

func swagToSnakeCase(in string) string {
	// Copied from https://github.com/swaggo/swag/blob/8ffc6c29c01a13fb01183ee91d0fcc5fc586b431/field_parser.go#L81
	// so that the serialized value can be aligned with the swagger spec.

	runes := []rune(in)
	length := len(runes)

	var out []rune
	for i := 0; i < length; i++ {
		if i > 0 && unicode.IsUpper(runes[i]) &&
			((i+1 < length && unicode.IsLower(runes[i+1])) || unicode.IsLower(runes[i-1])) {
			out = append(out, '_')
		}
		out = append(out, unicode.ToLower(runes[i]))
	}

	return string(out)
}
