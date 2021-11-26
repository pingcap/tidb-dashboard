// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"fmt"
	"io/ioutil"
	"os"
	"strconv"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

type pprofOptions struct {
	duration           uint
	fileNameWithoutExt string

	target  *model.RequestTargetNode
	fetcher *profileFetcher
}

func fetchPprof(op *pprofOptions) (string, string, error) {
	tmpfile, err := ioutil.TempFile("", op.fileNameWithoutExt)
	if err != nil {
		return "", "", fmt.Errorf("failed to create temp file: %v", err)
	}
	defer tmpfile.Close() // #nosec
	tmpPath := tmpfile.Name()

	fetcher := &fetcher{profileFetcher: op.fetcher, target: op.target}
	profileOutputType, err := fetcher.FetchAndWriteToFile(op.duration, tmpPath)
	if err != nil {
		return "", "", fmt.Errorf("failed to fetch annd write to temp file: %v", err)
	}

	return tmpPath, profileOutputType, nil
}

type fetcher struct {
	target         *model.RequestTargetNode
	profileFetcher *profileFetcher
}

func (f *fetcher) FetchAndWriteToFile(duration uint, tmpPath string) (string, error) {
	secs := strconv.Itoa(int(duration))
	url := "/debug/pprof/profile?seconds=" + secs

	resp, err := (*f.profileFetcher).fetch(&fetchOptions{ip: f.target.IP, port: f.target.Port, path: url})
	if err != nil {
		return "", fmt.Errorf("failed to fetch profile with proto format: %v", err)
	}

	w, err := os.Create(tmpPath)
	if err != nil {
		return "", fmt.Errorf("failed to create tmpPath to write profile: %v", err)
	}

	_, err = w.Write(resp)
	defer func() {
		if err := w.Close(); err != nil {
			fmt.Printf("failed to close file, %v", err)
		}
	}()

	if err != nil {
		return "", fmt.Errorf("failed to write profile: %v", err)
	}
	return "protobuf", nil
}
