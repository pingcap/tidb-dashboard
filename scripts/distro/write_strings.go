// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package main

import (
	"encoding/json"
	"flag"
	"io/ioutil"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/distro"
)

func main() {
	outputPath := flag.String("o", "", "Output json file path")
	flag.Parse()

	d, _ := json.Marshal(distro.R())
	if err := ioutil.WriteFile(*outputPath, d, 0o600); err != nil {
		log.Fatal("Write output failed", zap.Error(err))
	}
}
