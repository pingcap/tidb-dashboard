// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"fmt"
	"io/ioutil"
	"strconv"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

type pprofOptions struct {
	duration           uint
	fileNameWithoutExt string

	target  *model.RequestTargetNode
	fetcher *profileFetcher
}

func fetchPprof(op *pprofOptions) (string, TaskRawDataType, error) {
	fetcher := &fetcher{profileFetcher: op.fetcher, target: op.target}
	tmpPath, rawDataType, err := fetcher.FetchAndWriteToFile(op.duration, op.fileNameWithoutExt)
	if err != nil {
		return "", "", fmt.Errorf("failed to fetch annd write to temp file: %v", err)
	}

	return tmpPath, rawDataType, nil
}

type fetcher struct {
	target         *model.RequestTargetNode
	profileFetcher *profileFetcher
}

func (f *fetcher) FetchAndWriteToFile(duration uint, fileNameWithoutExt string) (string, TaskRawDataType, error) {
	tmpfile, err := ioutil.TempFile("", fileNameWithoutExt+"*.proto")
	if err != nil {
		return "", "", fmt.Errorf("failed to create tmpfile to write profile: %v", err)
	}

	defer func() {
		_ = tmpfile.Close()
	}()

	secs := strconv.Itoa(int(duration))
	url := "/debug/pprof/profile?seconds=" + secs

	resp, err := (*f.profileFetcher).fetch(&fetchOptions{ip: f.target.IP, port: f.target.Port, path: url})
	if err != nil {
		return "", "", fmt.Errorf("failed to fetch profile with proto format: %v", err)
	}

	_, err = tmpfile.Write(resp)
	if err != nil {
		return "", "", fmt.Errorf("failed to write profile: %v", err)
	}

	return tmpfile.Name(), RawDataTypeProtobuf, nil
}
