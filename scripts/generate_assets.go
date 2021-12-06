// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package main

import (
	"net/http"
	"os"

	"github.com/pingcap/log"
	"github.com/shurcooL/vfsgen"
	"go.uber.org/zap"
)

func main() {
	buildTag := ""
	if len(os.Args) > 1 {
		buildTag = os.Args[1]
	}
	var fs http.FileSystem = http.Dir("ui/build")
	err := vfsgen.Generate(fs, vfsgen.Options{
		BuildTags:    buildTag,
		PackageName:  "uiserver",
		VariableName: "assets",
	})
	if err != nil {
		log.Fatal("Generate vfs failed", zap.Error(err))
	}
}
