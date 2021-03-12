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
	"context"
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/goccy/go-graphviz"
	"github.com/google/pprof/driver"
	"github.com/google/pprof/profile"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
)

var (
	_  driver.Fetcher = (*fetcher)(nil)
	mu sync.Mutex
)

type flagSet struct {
	*flag.FlagSet
	args []string
}

const (
	maxProfilingTimeout = time.Minute * 5
)

func fetchPprof(ctx context.Context, httpClient *httpc.Client, target *model.RequestTargetNode, fileNameWithoutExt, format string, profileDurationSecs uint, httpScheme string) (string, error) {
	tmpfile, err := ioutil.TempFile("", fileNameWithoutExt)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %v", err)
	}
	defer tmpfile.Close()
	tmpPath := fmt.Sprintf("%s.%s", tmpfile.Name(), format)
	format = "-" + format
	args := []string{
		format,
		// prevent printing stdout
		"-output", "dummy",
		"-seconds", strconv.Itoa(int(profileDurationSecs)),
	}
	address := fmt.Sprintf("%s:%d", target.IP, target.Port)
	args = append(args, address)
	f := &flagSet{
		FlagSet: flag.NewFlagSet("pprof", flag.PanicOnError),
		args:    args,
	}
	if err := driver.PProf(&driver.Options{
		Fetch:   &fetcher{ctx: ctx, httpClient: httpClient, target: target, output: tmpPath, httpScheme: httpScheme},
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
	ctx        context.Context
	httpClient *httpc.Client
	target     *model.RequestTargetNode
	output     string
	httpScheme string
}

func (f *fetcher) Fetch(src string, duration, timeout time.Duration) (*profile.Profile, string, error) {
	var url string
	secs := strconv.Itoa(int(duration / time.Second))
	switch f.target.Kind {
	case model.NodeKindPD:
		url = "/pd/api/v1/debug/pprof/profile?seconds=" + secs
	case model.NodeKindTiDB:
		url = "/debug/pprof/profile?seconds=" + secs
	default:
		return nil, "", fmt.Errorf("unsupported target %s", f.target)
	}
	url = fmt.Sprintf("%s://%s:%d%s", f.httpScheme, f.target.IP, f.target.Port, url)

	p, err := f.getProfile(f.target, url)
	return p, url, err
}

func (f *fetcher) getProfile(target *model.RequestTargetNode, source string) (*profile.Profile, error) {
	req, err := http.NewRequestWithContext(f.ctx, http.MethodGet, source, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create a new request %s: %v", source, err)
	}
	if target.Kind == model.NodeKindPD {
		// forbidden PD follower proxy
		req.Header.Add("PD-Allow-follower-handle", "true")
	}
	resp, err := f.httpClient.WithTimeout(maxProfilingTimeout).Do(req)
	if err != nil {
		return nil, fmt.Errorf("request %s failed: %v", source, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to profile %s: status code %s", target, resp.Status)
	}
	return profile.Parse(resp.Body)
}

func profileAndWriteSVG(ctx context.Context, target *model.RequestTargetNode, fileNameWithoutExt string, profileDurationSecs uint, httpClient *httpc.Client, httpScheme string) (string, error) {
	switch target.Kind {
	case model.NodeKindTiKV:
		return fetchTiKVFlameGraphSVG(ctx, httpClient, target, fileNameWithoutExt, profileDurationSecs, httpScheme)
	case model.NodeKindPD, model.NodeKindTiDB:
		return fetchPprofSVG(ctx, httpClient, target, fileNameWithoutExt, profileDurationSecs, httpScheme)
	default:
		return "", fmt.Errorf("unsupported target %s", target)
	}
}

func fetchTiKVFlameGraphSVG(ctx context.Context, httpClient *httpc.Client, target *model.RequestTargetNode, fileNameWithoutExt string, profileDurationSecs uint, httpScheme string) (string, error) {
	// TODO: Switch to use tikv.Client
	uri := fmt.Sprintf("%s://%s:%d/debug/pprof/profile?seconds=%d", httpScheme, target.IP, target.Port, profileDurationSecs)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, uri, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create a new request %s: %v", uri, err)
	}
	resp, err := httpClient.WithTimeout(maxProfilingTimeout).Do(req)
	if err != nil {
		return "", fmt.Errorf("request %s failed: %v", uri, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("response of request %s is not ok: %s", uri, resp.Status)
	}
	svgFilePath, err := writePprofRsSVG(resp.Body, fileNameWithoutExt)
	if err != nil {
		return "", err
	}
	return svgFilePath, nil
}

func writePprofRsSVG(body io.ReadCloser, fileNameWithoutExt string) (string, error) {
	file, err := ioutil.TempFile("", fileNameWithoutExt)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %v", err)
	}
	_, err = io.Copy(file, body)
	if err != nil {
		return "", fmt.Errorf("failed to write temp file: %v", err)
	}
	svgFilePath := file.Name() + ".svg"
	err = os.Rename(file.Name(), svgFilePath)
	if err != nil {
		return "", fmt.Errorf("failed to write SVG from temp file: %v", err)
	}
	return svgFilePath, nil
}

func fetchPprofSVG(ctx context.Context, httpClient *httpc.Client, target *model.RequestTargetNode, fileNameWithoutExt string, profileDurationSecs uint, httpScheme string) (string, error) {
	// TODO: Switch to use tidb.Client or pd.Client
	f, err := fetchPprof(ctx, httpClient, target, fileNameWithoutExt, "dot", profileDurationSecs, httpScheme)
	if err != nil {
		return "", fmt.Errorf("failed to get DOT output from file: %v", err)
	}

	b, err := ioutil.ReadFile(f)
	if err != nil {
		return "", fmt.Errorf("failed to get DOT output from file: %v", err)
	}

	tmpfile, err := ioutil.TempFile("", fileNameWithoutExt)
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
