// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"flag"
	"fmt"
	"io"
	"strconv"
	"time"

	"github.com/goccy/go-graphviz"
	"github.com/google/pprof/driver"
	"github.com/google/pprof/profile"
)

func convertProtobufToSVG(content []byte, task TaskModel) ([]byte, error) {
	dotContent, err := convertProtobufToDot(content, task)
	if err != nil {
		return nil, fmt.Errorf("failed to convert protobuf to dot: %v", err)
	}
	svgContent, err := convertDotToSVG(dotContent)
	if err != nil {
		return nil, fmt.Errorf("failed to convert dot to svg: %v", err)
	}

	return svgContent, nil
}

func convertProtobufToDot(content []byte, _ TaskModel) ([]byte, error) {
	args := []string{
		"-dot",
		// prevent printing stdout
		"-output", "dummy",
		"-seconds", strconv.Itoa(int(1)),
	}
	// the addr is required for driver. Pporf but not used here
	// since we have fetched proto content and just want to convert it to dot
	address := ""
	args = append(args, address)
	f := &flagSet{
		FlagSet: flag.NewFlagSet("pprof", flag.PanicOnError),
		args:    args,
	}

	protoToDotWriter := &protobufToDotWriter{}
	if err := driver.PProf(&driver.Options{
		Fetch:   &dotFetcher{content},
		Flagset: f,
		UI:      &blankPprofUI{},
		Writer:  protoToDotWriter,
	}); err != nil {
		return nil, err
	}

	return protoToDotWriter.wc.data, nil
}

func convertDotToSVG(dotContent []byte) ([]byte, error) {
	g := graphviz.New()
	graph, err := graphviz.ParseBytes(dotContent)
	if err != nil {
		return nil, err
	}

	svgWriteCloser := &writeCloser{}
	if err := g.Render(graph, graphviz.SVG, svgWriteCloser); err != nil {
		return nil, err
	}
	return svgWriteCloser.data, nil
}

// implement a writer to write content to []byte.
type protobufToDotWriter struct {
	wc *writeCloser
}

func (w *protobufToDotWriter) Open(_ string) (io.WriteCloser, error) {
	w.wc = &writeCloser{data: make([]byte, 0)}
	return w.wc, nil
}

type writeCloser struct {
	data []byte
}

func (wc *writeCloser) Write(p []byte) (n int, err error) {
	wc.data = make([]byte, len(p))
	copy(wc.data, p)
	return len(p), nil
}

func (wc *writeCloser) Close() error {
	return nil
}

type dotFetcher struct {
	data []byte
}

func (f *dotFetcher) Fetch(_ string, _, _ time.Duration) (*profile.Profile, string, error) {
	profile, err := profile.ParseData(f.data)
	return profile, "", err
}

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

func (f *flagSet) AddExtraUsage(_ string) {}

// blankPprofUI is used to eliminate the pprof logs.
type blankPprofUI struct{}

func (b blankPprofUI) ReadLine(_ string) (string, error) {
	panic("not support")
}

func (b blankPprofUI) Print(_ ...interface{}) {
}

func (b blankPprofUI) PrintErr(_ ...interface{}) {
}

func (b blankPprofUI) IsTerminal() bool {
	return false
}

func (b blankPprofUI) WantBrowser() bool {
	return false
}

func (b blankPprofUI) SetAutoComplete(_ func(string) string) {
}
