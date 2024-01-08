// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"strings"

	"github.com/samber/lo"
)

func IsSubsetICaseInsensitive(a []string, b []string) bool {
	lowercaseA := lo.Map(a, func(x string, _ int) string {
		return strings.ToLower(x)
	})
	lowercaseB := lo.Map(b, func(x string, _ int) string {
		return strings.ToLower(x)
	})

	return len(lo.Intersect(lowercaseA, lowercaseB)) == len(lowercaseB)
}
