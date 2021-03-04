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

package profiling

import (
	"fmt"
	"io/ioutil"
	"os"
	"sync"

	"github.com/goccy/go-graphviz"
)

var mu sync.Mutex

type Writer interface {
	Write(p []byte) (string, error)
}

type fileWriter struct {
	fileNameWithoutExt string
	ext                string
}

func (w *fileWriter) Write(p []byte) (string, error) {
	f, err := ioutil.TempFile("", w.fileNameWithoutExt)
	if err != nil {
		return "", err
	}
	defer f.Close()

	path := fmt.Sprintf("%s.%s", f.Name(), w.ext)
	os.Rename(f.Name(), path)
	f.Write(p)

	return path, nil
}

type graphvizSVGWriter struct {
	fileNameWithoutExt string
}

func (w *graphvizSVGWriter) Write(b []byte) (string, error) {
	tmpfile, err := ioutil.TempFile("", w.fileNameWithoutExt)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %v", err)
	}
	defer tmpfile.Close()
	tmpPath := fmt.Sprintf("%s.%s", tmpfile.Name(), "svg")

	g := graphviz.New()
	mu.Lock()
	defer mu.Unlock()
	graph, err := graphviz.ParseBytes(b)
	if err != nil {
		return "", fmt.Errorf("failed to parse DOT file: %v", err)
	}

	if err := g.RenderFilename(graph, graphviz.SVG, tmpPath); err != nil {
		return "", fmt.Errorf("failed to render SVG: %v", err)
	}

	return tmpPath, nil
}