// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"strings"

	"github.com/thoas/go-funk"
)

func IsSubsets(a []string, b []string) bool {
	lowercaseA := funk.Map(a, func(x string) string {
		return strings.ToLower(x)
	}).([]string)
	lowercaseB := funk.Map(b, func(x string) string {
		return strings.ToLower(x)
	}).([]string)

	return len(funk.Join(lowercaseA, lowercaseB, funk.InnerJoin).([]string)) == len(lowercaseB)
}
