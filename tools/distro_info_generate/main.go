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
	"flag"
	"html/template"
	"io/ioutil"
	"log"
	"strconv"

	"go.uber.org/zap"
	"gopkg.in/yaml.v2"
)

func main() {
	buildTagFlag := flag.String("buildTag", "", "Distro build tag")
	flag.Parse()
	args := flag.Args()

	var distroPath string
	if len(args) > 0 {
		distroPath = args[0]
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

	err = t.Execute(buf, map[string]string{
		"PackageName":  "distro",
		"VariableName": "YAMLData",
		"BuildTag":     *buildTagFlag,
		"FileContent":  string(content),
	})
	if err != nil {
		log.Fatalln(zap.Error(err))
	}

	err = ioutil.WriteFile("distro_info.go", buf.Bytes(), 0644)
	if err != nil {
		log.Fatalln(zap.Error(err))
	}
}

var t = template.Must(template.New("").Funcs(template.FuncMap{
	"quote": func(s string) (template.HTML, error) {
		//nolint
		return template.HTML(strconv.Quote(s)), nil
	},
}).Parse(`// Code generate by distro_info_generate; DO NOT EDIT.
{{with .BuildTag}}// +build {{.}}

{{end}}package {{.PackageName}}

var {{.VariableName}} = []byte({{quote .FileContent}})
`))
