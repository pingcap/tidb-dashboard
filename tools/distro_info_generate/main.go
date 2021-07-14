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
	"bytes"
	"html/template"
	"io/ioutil"
	"log"
	"os"

	"go.uber.org/zap"
	"gopkg.in/yaml.v2"
)

func main() {
	var distroPath string
	if len(os.Args) > 1 {
		distroPath = os.Args[1]
	} else {
		log.Fatalln("Require distribution yaml path")
	}

	content, err := ioutil.ReadFile(distroPath)
	if err != nil {
		log.Fatalln(err)
	}
	err = yaml.Unmarshal(content, struct{}{})
	if err != nil {
		log.Fatal("Incorrect yaml format", zap.Error(err))
	}

	buf := new(bytes.Buffer)

	t.Execute(buf, struct {
		PackageName  string
		VariableName string
		FileContent  string
	}{
		PackageName:  "distro",
		VariableName: "DistroYAML",
		FileContent:  "`" + string(content) + "`",
	})

	_ = ioutil.WriteFile("distro_info.go", buf.Bytes(), 0644)
}

var t = template.Must(template.New("").Parse(`// Code generate by distro_info_generate; DO NOT EDIT.
package {{.PackageName}}

var {{.VariableName}} = []byte({{.FileContent}})
`))
