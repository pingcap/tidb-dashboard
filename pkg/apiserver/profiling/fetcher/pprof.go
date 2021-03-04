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
// See the License for the specific language governing permissions and
// limitations under the License.

package fetcher

import (
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/goccy/go-graphviz"
	"github.com/google/pprof/driver"
	"github.com/google/pprof/profile"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var (
	_  driver.Fetcher = (*pprofFetcher)(nil)
	_  ProfileFetcher = (*Pprof)(nil)
	mu sync.Mutex
)

type Pprof struct {
	Fetcher            *ClientFetcher
	Target             *model.RequestTargetNode
	FileNameWithoutExt string
}

func (p *Pprof) Fetch(op *ProfileFetchOptions) (d []byte, err error) {
	tmpfile, err := ioutil.TempFile("", p.FileNameWithoutExt)
	if err != nil {
		return d, fmt.Errorf("failed to create temp file: %v", err)
	}
	defer tmpfile.Close()

	format := "dot"
	tmpPath := fmt.Sprintf("%s.%s", tmpfile.Name(), format)
	format = "-" + format
	args := []string{
		format,
		// prevent printing stdout
		"-output", "dummy",
		"-seconds", strconv.Itoa(int(op.Duration)),
	}
	address := fmt.Sprintf("%s:%d", p.Target.IP, p.Target.Port)
	args = append(args, address)
	f := &flagSet{
		FlagSet: flag.NewFlagSet("pprof", flag.PanicOnError),
		args:    args,
	}
	if err := driver.PProf(&driver.Options{
		Fetch:   &pprofFetcher{Pprof: p},
		Flagset: f,
		UI:      &blankPprofUI{},
		Writer:  &oswriter{output: tmpPath},
	}); err != nil {
		return d, fmt.Errorf("failed to generate profile report: %v", err)
	}

	d, err = ioutil.ReadFile(tmpPath)
	if err != nil {
		return d, fmt.Errorf("failed to get DOT output from file: %v", err)
	}

	return
}

type GraphvizSVGWriter struct {
	Path string
}

func (w *GraphvizSVGWriter) Write(b []byte) (int, error) {
	tmpfile, err := ioutil.TempFile("", w.Path)
	if err != nil {
		return 0, fmt.Errorf("failed to create temp file: %v", err)
	}
	defer tmpfile.Close()

	g := graphviz.New()
	mu.Lock()
	defer mu.Unlock()
	graph, err := graphviz.ParseBytes(b)
	if err != nil {
		return 0, fmt.Errorf("failed to parse DOT file: %v", err)
	}

	if err := g.RenderFilename(graph, graphviz.SVG, tmpfile.Name()); err != nil {
		return 0, fmt.Errorf("failed to render SVG: %v", err)
	}

	return len(b), nil
}

// func fetchPprofSVG(op *ProfileFetchOptions) (string, error) {
// f, err := fetchPprof(op, "dot")

// b, err := ioutil.ReadFile(f)
// if err != nil {
// 	return "", fmt.Errorf("failed to get DOT output from file: %v", err)
// }

// tmpfile, err := ioutil.TempFile("", op.fileNameWithoutExt)
// if err != nil {
// 	return "", fmt.Errorf("failed to create temp file: %v", err)
// }
// defer tmpfile.Close()
// tmpPath := fmt.Sprintf("%s.%s", tmpfile.Name(), "svg")

// g := graphviz.New()
// mu.Lock()
// defer mu.Unlock()
// graph, err := graphviz.ParseBytes(b)
// if err != nil {
// 	return "", fmt.Errorf("failed to parse DOT file: %v", err)
// }

// if err := g.RenderFilename(graph, graphviz.SVG, tmpPath); err != nil {
// 	return "", fmt.Errorf("failed to render SVG: %v", err)
// }

// return tmpPath, nil
// }

type flagSet struct {
	*flag.FlagSet
	args []string
}

func (f *flagSet) StringList(o, d, c string) *[]*string {
	return &[]*string{f.String(o, d, c)}
}

func (f *flagSet) ExtraUsage() string {
	return ""
}

func (f *flagSet) Parse(usage func()) []string {
	f.Usage = usage
	_ = f.FlagSet.Parse(f.args)
	return f.Args()
}

func (f *flagSet) AddExtraUsage(eu string) {}

// oswriter implements the Writer interface using a regular file.
type oswriter struct {
	output string
}

func (o *oswriter) Open(name string) (io.WriteCloser, error) {
	f, err := os.Create(o.output)
	return f, err
}

type pprofFetcher struct {
	*Pprof
}

func (f *pprofFetcher) Fetch(src string, duration, timeout time.Duration) (*profile.Profile, string, error) {
	secs := strconv.Itoa(int(duration / time.Second))
	url := "/debug/pprof/profile?seconds=" + secs

	resp, err := (*f.Fetcher).Fetch(&ClientFetchOptions{IP: f.Target.IP, Port: f.Target.Port, Path: url})
	if err != nil {
		return nil, url, err
	}

	p, err := profile.ParseData(resp)
	return p, url, err
}

// blankPprofUI is used to eliminate the pprof logs
type blankPprofUI struct {
}

func (b blankPprofUI) ReadLine(prompt string) (string, error) {
	panic("not support")
}

func (b blankPprofUI) Print(i ...interface{}) {
}

func (b blankPprofUI) PrintErr(i ...interface{}) {
}

func (b blankPprofUI) IsTerminal() bool {
	return false
}

func (b blankPprofUI) WantBrowser() bool {
	return false
}

func (b blankPprofUI) SetAutoComplete(complete func(string) string) {
}
