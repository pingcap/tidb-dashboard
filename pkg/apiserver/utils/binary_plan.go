// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"encoding/base64"

	simplejson "github.com/bitly/go-simplejson"
	"github.com/golang/snappy"
	"github.com/pingcap/tipb/go-tipb"
	json "google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/runtime/protoimpl"
)

const (
	MainTree = "main"
	CteTrees = "ctes"
	Children = "children"
)

// GenerateBinaryPlan generate visual plan from raw data.
func GenerateBinaryPlan(v string) (*tipb.ExplainData, error) {
	if v == "" {
		return nil, nil
	}

	// base64 decode
	compressVPBytes, err := base64.StdEncoding.DecodeString(v)
	if err != nil {
		return nil, err
	}

	// snappy uncompress
	bpBytes, err := snappy.Decode(nil, compressVPBytes)
	if err != nil {
		return nil, err
	}

	// proto unmarshal
	bp := &tipb.ExplainData{}
	err = bp.Unmarshal(bpBytes)
	if err != nil {
		return nil, err
	}
	return bp, nil
}

func GenerateBinaryPlanJSON(b string) (string, error) {
	// generate bp
	bp, err := GenerateBinaryPlan(b)
	if err != nil {
		return "", err
	}

	if bp == nil {
		return "", nil
	}

	// json marshal
	bpJSON, err := json.Marshal(protoimpl.X.ProtoMessageV2Of(bp))
	if err != nil {
		return "", err
	}

	// new simple json
	vp, err := simplejson.NewJson(bpJSON)
	if err != nil {
		return "", err
	}

	// main
	err = analyzeRoot(vp.Get(MainTree))
	if err != nil {
		return "", err
	}

	// ctes
	err = analyzeTrees(vp.Get(CteTrees))
	if err != nil {
		return "", err
	}

	// to string
	vpJSON, err := vp.MarshalJSON()
	if err != nil {
		return "", err
	}

	return string(vpJSON), nil
}

func analyzeRoot(root *simplejson.Json) error {
	c := root.Get(Children)
	err := analyzeTrees(c)
	if err != nil {
		return err
	}

	return nil
}

func analyzeTrees(ctes *simplejson.Json) error {
	length := len(ctes.MustArray())

	if length == 0 {
		return nil
	}

	for i := 0; i < length; i++ {
		c := ctes.GetIndex(i)
		err := analyzeRoot(c)
		if err != nil {
			return err
		}
	}

	return nil
}
