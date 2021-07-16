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

package distro

import (
	"log"

	"go.uber.org/zap"
	"gopkg.in/yaml.v2"
)

type Info struct {
	Tidb    string `yaml:"tidb"`
	Tikv    string `yaml:"tikv"`
	Tiflash string `yaml:"tiflash"`
	PD      string `yaml:"pd"`
}

var Data = &Info{
	Tidb:    "TiDB",
	Tikv:    "TiKV",
	Tiflash: "TiFlash",
	PD:      "PD",
}

func PopulateDistro(distroYAML []byte) {
	if string(distroYAML) == "" {
		return
	}

	err := yaml.Unmarshal(distroYAML, Data)
	if err != nil {
		log.Fatal("Incorrect yaml format", zap.Error(err))
	}
}
