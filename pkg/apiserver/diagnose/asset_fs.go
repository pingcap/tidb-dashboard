// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.
// +build !hot_swap_template

package diagnose

import (
	"bufio"
	"io/ioutil"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
)

func readFromFS(name string, filename string) utils.TemplateInfoWithFilename {
	file, _ := fs.Open(filename)
	defer file.Close()
	content, _ := ioutil.ReadAll(bufio.NewReader(file))
	return utils.TemplateInfoWithFilename{
		Name: name,
		Text: string(content),
	}
}
