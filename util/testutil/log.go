// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package testutil

import "github.com/pingcap/log"

func EnableDebugLog() {
	logger, prop, err := log.InitLogger(&log.Config{
		Level: "debug",
	})
	if err != nil {
		panic(err)
	}
	log.ReplaceGlobals(logger, prop)
}
