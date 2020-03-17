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
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"strconv"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
)

func profileAndWriteSVG(ctx context.Context, target *utils.RequestTargetNode, fileNameWithoutExt string, profileDurationSecs uint, httpClient *http.Client, tls bool) (string, error) {
	url, err := getProfilingURL(target, profileDurationSecs, tls)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req = req.WithContext(ctx)
	if target.Kind == utils.NodeKindPD {
		// forbidden PD follower proxy
		req.Header.Add("PD-Allow-follower-handle", "true")
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send profiling request to %s (url = %s): %s", target, url, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to profile %s: status code %s", target, resp.Status)
	}

	svgFilePath, err := writeProfilingSVG(target, resp.Body, fileNameWithoutExt)
	if err != nil {
		return "", fmt.Errorf("failed to write profiling result: %s", err)
	}
	return svgFilePath, nil
}

func getProfilingURL(target *utils.RequestTargetNode, profileDurationSecs uint, tls bool) (string, error) {
	var url string
	secs := strconv.Itoa(int(profileDurationSecs))
	switch target.Kind {
	case utils.NodeKindPD:
		url = "/pd/api/v1/debug/pprof/profile?seconds=" + secs
	case utils.NodeKindTiKV, utils.NodeKindTiDB:
		url = "/debug/pprof/profile?seconds=" + secs
	default:
		return "", fmt.Errorf("unsupported target %s", target)
	}
	schema := "http"
	// TiKV dose not support TLS for the status server currently
	if target.Kind != utils.NodeKindTiKV && tls {
		schema = "https"
	}
	return fmt.Sprintf("%s://%s:%d%s", schema, target.IP, target.Port, url), nil
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

func writePprofGoSVG(body io.ReadCloser, fileNameWithoutExt string) (string, error) {
	profileFile, err := ioutil.TempFile("", fileNameWithoutExt)
	if err != nil {
		return "", fmt.Errorf("create temp file failed: %s", err)
	}
	defer os.Remove(profileFile.Name()) // Clean up
	_, err = io.Copy(profileFile, body)
	if err != nil {
		return "", fmt.Errorf("write temp file failed: %s", err)
	}
	svgFilePath := profileFile.Name() + ".svg"
	if _, err := exec.Command(goCmd(), "tool", "pprof", "-svg", "-output", svgFilePath, profileFile.Name()).CombinedOutput(); err != nil { //nolint:gosec
		return "", fmt.Errorf("generate SVG using pprof failed: %s", err)
	}
	return svgFilePath, nil
}

func writeProfilingSVG(target *utils.RequestTargetNode, body io.ReadCloser, fileNameWithoutExt string) (string, error) {
	switch target.Kind {
	case utils.NodeKindTiKV:
		return writePprofRsSVG(body, fileNameWithoutExt)
	case utils.NodeKindPD, utils.NodeKindTiDB:
		return writePprofGoSVG(body, fileNameWithoutExt)
	default:
		return "", fmt.Errorf("unsupported target %s", target)
	}
}
