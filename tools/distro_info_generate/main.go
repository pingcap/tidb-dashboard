// Copyright 2021 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
	if err := ioutil.WriteFile(*outputPath, d, 0600); err != nil {
		log.Fatalln(zap.Error(err))
	}
}
