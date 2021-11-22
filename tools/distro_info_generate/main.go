// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package main

import (
	"encoding/json"
	"flag"
	"io/ioutil"
	"log"

	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
	_ "github.com/pingcap/tidb-dashboard/populate/distro"
)

func main() {
	outputPath := flag.String("o", "", "Distro resource output path")
	flag.Parse()

	d, err := json.Marshal(distro.Resource())
	if err != nil {
		log.Fatalln(zap.Error(err))
	}
	if err := ioutil.WriteFile(*outputPath, d, 0o600); err != nil {
		log.Fatalln(zap.Error(err))
	}
}
