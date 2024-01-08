// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package main

import (
	"net/http"
	"os"

	"github.com/pingcap/log"
	"github.com/shurcooL/vfsgen"
	"go.uber.org/zap"
)

func main() {
	if len(os.Args) < 3 {
		log.Fatal("Require 2 args")
	}
	directory := os.Args[1]
	buildTag := os.Args[2]
	var fs http.FileSystem = http.Dir(directory)
	err := vfsgen.Generate(fs, vfsgen.Options{
		BuildTags:    buildTag,
		PackageName:  "uiserver",
		VariableName: "assets",
	})
	if err != nil {
		log.Fatal("Generate vfs failed", zap.Error(err))
	}
}
