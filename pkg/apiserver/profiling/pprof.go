// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"fmt"
	"io/ioutil"
	"os"
	"strconv"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

// var (
// 	_ driver.Fetcher = (*fetcher)(nil)
// 	// mu sync.Mutex.
// )

type pprofOptions struct {
	duration uint
	// frequency          uint
	fileNameWithoutExt string

	target  *model.RequestTargetNode
	fetcher *profileFetcher
}

// func fetchPprofSVG(op *pprofOptions) (string, error) {
// 	f, err := fetchPprof(op, "dot")
// 	if err != nil {
// 		return "", fmt.Errorf("failed to get DOT output from file: %v", err)
// 	}

// 	b, err := ioutil.ReadFile(filepath.Clean(f))
// 	if err != nil {
// 		return "", fmt.Errorf("failed to get DOT output from file: %v", err)
// 	}

// 	tmpfile, err := ioutil.TempFile("", op.fileNameWithoutExt)
// 	if err != nil {
// 		return "", fmt.Errorf("failed to create temp file: %v", err)
// 	}
// 	defer tmpfile.Close() // #nosec
// 	tmpPath := fmt.Sprintf("%s.%s", tmpfile.Name(), "svg")

// 	g := graphviz.New()
// 	mu.Lock()
// 	defer mu.Unlock()
// 	graph, err := graphviz.ParseBytes(b)
// 	if err != nil {
// 		return "", fmt.Errorf("failed to parse DOT file: %v", err)
// 	}

// 	if err := g.RenderFilename(graph, graphviz.SVG, tmpPath); err != nil {
// 		return "", fmt.Errorf("failed to render SVG: %v", err)
// 	}

// 	return tmpPath, nil
// }

func fetchPprof(op *pprofOptions) (string, error) {
	tmpfile, err := ioutil.TempFile("", op.fileNameWithoutExt)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %v", err)
	}
	defer tmpfile.Close() // #nosec
	tmpPath := tmpfile.Name()

	fetcher := &fetcher{profileFetcher: op.fetcher, target: op.target}
	if err := fetcher.FetchAndWriteToFile(op.duration, tmpPath); err != nil {
		return "", fmt.Errorf("failed to fetch annd write to temp file: %v", err)
	}

	return tmpPath, nil
}

type fetcher struct {
	target         *model.RequestTargetNode
	profileFetcher *profileFetcher
}

func (f *fetcher) FetchAndWriteToFile(duration uint, tmpPath string) error {
	secs := strconv.Itoa(int(duration))
	url := "/debug/pprof/profile?seconds=" + secs

	resp, err := (*f.profileFetcher).fetch(&fetchOptions{ip: f.target.IP, port: f.target.Port, path: url})
	if err != nil {
		return fmt.Errorf("failed to fetch profile with proto format: %v", err)
	}

	w, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("failed to create tmpPath to write profile: %v", err)
	}

	_, err = w.Write(resp)
	if err != nil {
		return fmt.Errorf("failed to write profile: %v", err)
	}

	if err := w.Close(); err != nil {
		return fmt.Errorf("failed to close tmpPath: %v", err)
	}

	return nil
}
