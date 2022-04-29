// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"encoding/base64"
	"encoding/json"

	"github.com/golang/snappy"

	"github.com/pingcap/tipb/go-tipb"
)

// GenerateVisualPlan generate visual plan from raw data.
func GenerateVisualPlan(v string) (*tipb.VisualData, error) {
	if v == "" {
		return nil, nil
	}

	// base64 decode
	compressVPBytes, err := base64.StdEncoding.DecodeString(v)
	if err != nil {
		return nil, err
	}

	// snappy uncompress
	vpBytes, err := snappy.Decode(nil, compressVPBytes)
	if err != nil {
		return nil, err
	}

	// proto unmarshal
	visual := &tipb.VisualData{}
	err = visual.Unmarshal(vpBytes)
	if err != nil {
		return nil, err
	}
	return visual, nil
}

func GenerateVisualPlanJSON(v string) (string, error) {
	// generate vp
	vp, err := GenerateVisualPlan(v)
	if err != nil {
		return "", err
	}

	// json marshal
	vpJSON, err := json.Marshal(vp)
	if err != nil {
		return "", err
	}

	return string(vpJSON), nil
}
