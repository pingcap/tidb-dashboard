// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"encoding/base64"
	"strings"

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

var (
	needJSONFormat = []string{
		"rootBasicExecInfo",
		"rootGroupExecInfo",
		// "operatorInfo",
		"copExecInfo",
	}

	needSetNA = []string{
		"diskBytes",
		"memoryBytes",
	}
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
	err = analyzeNode(vp.Get(MainTree))
	if err != nil {
		return "", err
	}

	// ctes
	err = analyzeChildrenNodes(vp.Get(CteTrees))
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

func analyzeNode(node *simplejson.Json) error {
	// format
	for _, key := range needSetNA {
		if node.Get(key).MustString() == "-1" {
			node.Set(key, "N/A")
		}
	}

	// I don't want to do that either, but have to convert the irregular string to json
	for _, key := range needJSONFormat {
		if key == "rootGroupExecInfo" {
			slist := node.Get(key).MustStringArray()
			newSlist := []interface{}{}
			for _, s := range slist {
				sJSON, err := formatJSON(s)
				if err != nil {
					newSlist = append(newSlist, s)
				}
				newSlist = append(newSlist, sJSON)
			}
			node.Set(key, newSlist)
		} else {
			s := node.Get(key).MustString()
			sJSON, err := formatJSON(s)
			if err != nil {
				continue
			}
			node.Set(key, sJSON)
		}
	}

	c := node.Get(Children)
	err := analyzeChildrenNodes(c)
	if err != nil {
		return err
	}

	return nil
}

func analyzeChildrenNodes(noeds *simplejson.Json) error {
	length := len(noeds.MustArray())

	// no children nodes
	if length == 0 {
		return nil
	}

	for i := 0; i < length; i++ {
		c := noeds.GetIndex(i)
		err := analyzeNode(c)
		if err != nil {
			return err
		}
	}

	return nil
}

func formatJSON(s string) (*simplejson.Json, error) {
	s = `{` + s + `}`
	s = strings.ReplaceAll(s, "{", `{"`)
	s = strings.ReplaceAll(s, "}", `"}`)
	s = strings.ReplaceAll(s, ":", `":"`)
	s = strings.ReplaceAll(s, ",", `","`)
	s = strings.ReplaceAll(s, `" `, `"`)
	s = strings.ReplaceAll(s, `}"`, `}`)
	s = strings.ReplaceAll(s, `"{`, `{`)
	s = strings.ReplaceAll(s, `{""}`, "{}")

	return simplejson.NewJson([]byte(s))
}
