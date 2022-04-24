// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"encoding/base64"
	"encoding/json"

	"github.com/golang/snappy"

	"github.com/pingcap/tipb/go-tipb"
)

// GenerateVisualPlanFromStr.
func GenerateVisualPlanFromStr(visualPlanStr string) (string, error) {
	// base64 decode
	compressVisualBytes, err := base64.StdEncoding.DecodeString(visualPlanStr)
	if err != nil {
		return "", err
	}

	// snappy uncompress
	visualBytes, err := snappy.Decode(nil, compressVisualBytes)
	if err != nil {
		return "", err
	}

	// proto unmarshal
	visual := &tipb.VisualData{}
	err = visual.Unmarshal(visualBytes)
	if err != nil {
		return "", err
	}

	// json marshal
	visualJSON, err := json.Marshal(visual)
	if err != nil {
		return "", err
	}

	return string(visualJSON), nil
}
