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
	"flag"
	"io/ioutil"
	"log"

	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
	"go.uber.org/zap"
	"gopkg.in/yaml.v2"
)

func main() {
	yamlOutputPath := flag.String("o", "", "Distro yaml output path")
	flag.Parse()

	d, err := yaml.Marshal(distro.Data)
	if err != nil {
		log.Fatalln(zap.Error(err))
	}
	if err := ioutil.WriteFile(*yamlOutputPath, d, 0666); err != nil {
		log.Fatalln(zap.Error(err))
	}
}
