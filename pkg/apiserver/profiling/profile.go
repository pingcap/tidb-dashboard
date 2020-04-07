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
	"time"

	"github.com/google/pprof/driver"
	"github.com/google/pprof/profile"
	"github.com/pkg/errors"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
)

type flagSet struct {
	*flag.FlagSet
	args []string
}

func fetchPprofSVG(ctx context.Context, httpClient *http.Client, target *utils.RequestTargetNode, fileNameWithoutExt, format string, profileDurationSecs uint, tls bool) (string, error) {
	tmpfile, err := ioutil.TempFile("", fileNameWithoutExt)
	if err != nil {
		return "", err
	}
	defer tmpfile.Close()
	svgPath := tmpfile.Name() + ".svg"
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
		Fetch:   &fetcher{ctx: ctx, httpClient: httpClient, target: target, output: svgPath, tls: tls},
		Flagset: f,
		Writer:  &oswriter{output: svgPath},
	}); err != nil {
		return "", err
	}
	return svgPath, nil
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
	httpClient *http.Client
	target     *utils.RequestTargetNode
	output     string
	tls        bool
}

func (f *fetcher) Fetch(src string, duration, timeout time.Duration) (*profile.Profile, string, error) {
	var url string
	secs := strconv.Itoa(int(duration / time.Second))
	switch f.target.Kind {
	case utils.NodeKindPD:
		url = "/pd/api/v1/debug/pprof/profile?seconds=" + secs
	case utils.NodeKindTiDB:
		url = "/debug/pprof/profile?seconds=" + secs
	default:
		return nil, "", fmt.Errorf("unsupported target %s", f.target)
	}
	schema := "http"
	if f.tls {
		schema = "https"
	}
	url = fmt.Sprintf("%s://%s:%d%s", schema, f.target.IP, f.target.Port, url)

	p, err := f.getProfile(f.target, url)
	return p, url, err
}

func (f *fetcher) getProfile(target *utils.RequestTargetNode, source string) (*profile.Profile, error) {
	req, err := http.NewRequest(http.MethodGet, source, nil)
	if err != nil {
		return nil, err
	}
	req = req.WithContext(f.ctx)
	if target.Kind == utils.NodeKindPD {
		// forbidden PD follower proxy
		req.Header.Add("PD-Allow-follower-handle", "true")
	}
	resp, err := f.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		defer resp.Body.Close()
		return nil, fmt.Errorf("failed to profile %s: status code %s", target, resp.Status)
	}
	return profile.Parse(resp.Body)
}

func profileAndWriteSVG(ctx context.Context, target *utils.RequestTargetNode, fileNameWithoutExt string, profileDurationSecs uint, httpClient *http.Client, tls bool) (string, error) {
	switch target.Kind {
	case utils.NodeKindTiKV:
		return fetchFlameGraphSVG(ctx, httpClient, target, fileNameWithoutExt, profileDurationSecs, tls)
	case utils.NodeKindPD, utils.NodeKindTiDB:
		return fetchPprofSVG(ctx, httpClient, target, fileNameWithoutExt, "svg", profileDurationSecs, tls)
	default:
		return "", fmt.Errorf("unsupported target %s", target)
	}
}

func fetchFlameGraphSVG(ctx context.Context, httpClient *http.Client, target *utils.RequestTargetNode, fileNameWithoutExt string, profileDurationSecs uint, tls bool) (string, error) {
	schema := "http"
	if tls {
		schema = "https"
	}
	url := fmt.Sprintf("%s://%s:%d/debug/pprof/profile?seconds=%d", schema, target.IP, target.Port, profileDurationSecs)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req = req.WithContext(ctx)
	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", errors.Errorf("request %s failed: %s", url, resp.Status)
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
		return "", fmt.Errorf("create temp file failed: %s", err)
	}
	_, err = io.Copy(file, body)
	if err != nil {
		return "", fmt.Errorf("write temp file failed: %s", err)
	}
	svgFilePath := file.Name() + ".svg"
	err = os.Rename(file.Name(), svgFilePath)
	if err != nil {
		return "", fmt.Errorf("write SVG from temp file failed: %s", err)
	}
	return svgFilePath, nil
}
