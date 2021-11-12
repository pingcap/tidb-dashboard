// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"fmt"
	"io"
	"io/ioutil"
	"os"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

type flameGraphOptions struct {
	duration uint
	// frequency          uint
	fileNameWithoutExt string

	target  *model.RequestTargetNode
	fetcher *profileFetcher
}

func fetchFlameGraphSVG(op *flameGraphOptions) (string, error) {
	path := fmt.Sprintf("/debug/pprof/profile?seconds=%d", op.duration)
	resp, err := (*op.fetcher).fetch(&fetchOptions{ip: op.target.IP, port: op.target.Port, path: path})
	if err != nil {
		return "", err
	}
	svgFilePath, err := writePprofRsSVG(resp, op.fileNameWithoutExt)
	if err != nil {
		return "", err
	}
	return svgFilePath, nil
}

func writePprofRsSVG(body []byte, fileNameWithoutExt string) (string, error) {
	file, err := ioutil.TempFile("", fileNameWithoutExt)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %v", err)
	}
	_, err = io.WriteString(file, string(body))
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
