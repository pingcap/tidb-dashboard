// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package testdefault

import (
	"runtime"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/goleak"
)

func enableDebugLog() {
	logger, prop, err := log.InitLogger(&log.Config{
		Level: "debug",
	})
	if err != nil {
		panic(err)
	}
	log.ReplaceGlobals(logger, prop)
}

func TestMain(m *testing.M) {
	enableDebugLog()
	gin.SetMode(gin.TestMode)
	goleak.VerifyTestMain(m)
	runtime.GC()
}
