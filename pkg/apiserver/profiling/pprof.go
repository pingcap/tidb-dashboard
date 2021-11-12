// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/goccy/go-graphviz"
	"github.com/google/pprof/driver"
	"github.com/google/pprof/profile"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var (
	_  driver.Fetcher = (*fetcher)(nil)
	mu sync.Mutex
)

type pprofOptions struct {
	duration uint
	// frequency          uint
	fileNameWithoutExt string

	target  *model.RequestTargetNode
	fetcher *profileFetcher
}

func fetchPprofSVG(op *pprofOptions) (string, error) {
	f, err := fetchPprof(op, "dot")
	if err != nil {
		return "", fmt.Errorf("failed to get DOT output from file: %v", err)
	}

	b, err := ioutil.ReadFile(filepath.Clean(f))
	if err != nil {
		return "", fmt.Errorf("failed to get DOT output from file: %v", err)
	}

	tmpfile, err := ioutil.TempFile("", op.fileNameWithoutExt)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %v", err)
	}
	defer tmpfile.Close() // #nosec
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

type flagSet struct {
	*flag.FlagSet
	args []string
}

func fetchPprof(op *pprofOptions, format string) (string, error) {
	tmpfile, err := ioutil.TempFile("", op.fileNameWithoutExt)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %v", err)
	}
	defer tmpfile.Close() // #nosec
	tmpPath := fmt.Sprintf("%s.%s", tmpfile.Name(), format)
	format = "-" + format
	args := []string{
		format,
		// prevent printing stdout
		"-output", "dummy",
		"-seconds", strconv.Itoa(int(op.duration)),
	}
	address := fmt.Sprintf("%s:%d", op.target.IP, op.target.Port)
	args = append(args, address)
	f := &flagSet{
		FlagSet: flag.NewFlagSet("pprof", flag.PanicOnError),
		args:    args,
	}
	if err := driver.PProf(&driver.Options{
		Fetch:   &fetcher{profileFetcher: op.fetcher, target: op.target},
		Flagset: f,
		UI:      &blankPprofUI{},
		Writer:  &oswriter{output: tmpPath},
	}); err != nil {
		return "", fmt.Errorf("failed to generate profile report: %v", err)
	}
	return tmpPath, nil
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

type fetcher struct {
	target         *model.RequestTargetNode
	profileFetcher *profileFetcher
}

func (f *fetcher) Fetch(src string, duration, timeout time.Duration) (*profile.Profile, string, error) {
	secs := strconv.Itoa(int(duration / time.Second))
	url := "/debug/pprof/profile?seconds=" + secs

	resp, err := (*f.profileFetcher).fetch(&fetchOptions{ip: f.target.IP, port: f.target.Port, path: url})
	if err != nil {
		return nil, url, err
	}

	p, err := profile.ParseData(resp)
	return p, url, err
}

// blankPprofUI is used to eliminate the pprof logs.
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
