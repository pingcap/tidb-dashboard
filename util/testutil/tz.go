// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package testutil

import (
	"time"
)

func SetDefaultTimeZone(tz string) func() {
	loc, err := time.LoadLocation(tz)
	if err != nil {
		panic(err)
	}

	currentLoc := time.Local
	time.Local = loc
	return func() {
		time.Local = currentLoc
	}
}
