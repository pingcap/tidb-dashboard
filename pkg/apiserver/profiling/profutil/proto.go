// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profutil

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

func ConvertProtoToGraphSVG(protoData []byte) ([]byte, error) {
	dotData, err := convertProtoToDot(protoData)
	if err != nil {
		return nil, fmt.Errorf("failed to generate dot file: %w", err)
	}
	svgData, err := convertDotToSVG(dotData)
	if err != nil {
		return nil, fmt.Errorf("failed to generate dot svg: %w", err)
	}
	return svgData, nil
}

func convertProtoToDot(protoData []byte) ([]byte, error) {
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
		FlagSet: flag.NewFlagSet("pprof", flag.ContinueOnError),
		args:    args,
	}

	protoToDotWriter := &protobufToDotWriter{}
	if err := driver.PProf(&driver.Options{
		Fetch:   &dotFetcher{protoData},
		Flagset: f,
		UI:      blankPprofUI{},
		Writer:  protoToDotWriter,
	}); err != nil {
		return nil, err
	}

	return protoToDotWriter.wc.data, nil
}

func convertDotToSVG(dotData []byte) ([]byte, error) {
	g := graphviz.New()
	graph, err := graphviz.ParseBytes(dotData)
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

func (w *protobufToDotWriter) Open(name string) (io.WriteCloser, error) {
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
	p, err := profile.ParseData(f.data)
	return p, "", err
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

func (f *flagSet) AddExtraUsage(eu string) {}

// blankPprofUI is used to eliminate the pprof logs.
type blankPprofUI struct{}

func (b blankPprofUI) ReadLine(prompt string) (string, error) {
	return "", nil
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
