// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"encoding/base64"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	simplejson "github.com/bitly/go-simplejson"
	"github.com/golang/snappy"
	"github.com/pingcap/tipb/go-tipb"
	json "google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/runtime/protoimpl"
)

const (
	MainTree          = "main"
	CteTrees          = "ctes"
	Children          = "children"
	Duration          = "duration"
	RootGroupExecInfo = "rootGroupExecInfo"
	RootBasicExecInfo = "rootBasicExecInfo"
	CopExecInfo       = "copExecInfo"
	TaskType          = "taskType"
	StoreType         = "storeType"
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

	bpJSON, err = formatBinaryPlanJSON(bpJSON)
	if err != nil {
		return "", err
	}

	bpJSON, err = analyzeDuration(bpJSON)
	if err != nil {
		return "", err
	}

	return string(bpJSON), nil
}

func analyzeDuration(bp []byte) ([]byte, error) {
	// new simple json
	vp, err := simplejson.NewJson(bp)
	if err != nil {
		return nil, err
	}

	// main
	_, _, _, _, err = analyzeDurationNode(vp.Get(MainTree), 1, 1, 1)
	if err != nil {
		return nil, err
	}

	// ctes
	_, err = analyzeDurationNodes(vp.Get(CteTrees), 1, 1, 1)
	if err != nil {
		return nil, err
	}

	return vp.MarshalJSON()
}

// analyzeDurationNode set node.duration.
func analyzeDurationNode(node *simplejson.Json, concurrency, copConcurrency, tableConcurrency int) (time.Duration, int, int, int, error) {
	// get duration time
	ts := node.GetPath(RootBasicExecInfo, "time").MustString()

	// cop task
	if ts == "" {
		storeType := node.GetPath(StoreType).MustString()
		ts = node.GetPath(CopExecInfo, fmt.Sprintf("%s_task", storeType), "time").MustString()
		if ts == "" {
			switch node.GetPath(TaskType).MustString() {
			case "cop":
				// cop task count
				taskCountStr := node.GetPath(CopExecInfo, fmt.Sprintf("%s_task", storeType), "tasks").MustString()
				taskCount, _ := strconv.Atoi(taskCountStr)
				maxTS := node.GetPath(CopExecInfo, fmt.Sprintf("%s_task", storeType), "proc max").MustString()
				avgTS := node.GetPath(CopExecInfo, fmt.Sprintf("%s_task", storeType), "avg").MustString()
				if taskCount <= copConcurrency {
					ts = maxTS
				} else {
					avgDuration, err := time.ParseDuration(avgTS)
					if err != nil {
						ts = maxTS
						break
					}
					avgDuration = avgDuration * time.Duration((taskCount / copConcurrency))
					maxDuration, err := time.ParseDuration(maxTS)
					if err != nil {
						ts = maxTS
						break
					}

					if avgDuration > maxDuration {
						ts = maxTS
						break
					}

					ts = avgDuration.String()
				}
			// tiflash
			case "batchCop", "mpp":
				ts = node.GetPath(CopExecInfo, fmt.Sprintf("%s_task", storeType), "proc max").MustString()
			default:
				ts = "0s"
			}
		}
	}

	duration, err := time.ParseDuration(ts)
	if err != nil {
		return 0, concurrency, copConcurrency, tableConcurrency, err
	}

	// concurrency, copConcurrency
	rootGroupInfo := node.Get(RootGroupExecInfo)
	rootGroupInfoCount := len(rootGroupInfo.MustArray())
	if rootGroupInfoCount > 0 {
		for i := 0; i < rootGroupInfoCount; i++ {
			tmpConcurrencyStr := rootGroupInfo.GetIndex(i).GetPath("inner", "concurrency").MustString()
			tmpConcurrency, _ := strconv.Atoi(tmpConcurrencyStr)
			if tmpConcurrency > 0 {
				concurrency = tmpConcurrency
			}

			tmpCopConcurrencyStr := rootGroupInfo.GetIndex(i).GetPath("cop_task", "distsql_concurrency").MustString()
			tmpCopConcurrency, _ := strconv.Atoi(tmpCopConcurrencyStr)
			if tmpCopConcurrency > 0 {
				copConcurrency = tmpCopConcurrency
			}

			tmpTableConcurrencyStr := rootGroupInfo.GetIndex(i).GetPath("table_task", "concurrency").MustString()
			tmpTableConcurrency, _ := strconv.Atoi(tmpTableConcurrencyStr)
			if tmpTableConcurrency > 0 {
				tableConcurrency = tmpTableConcurrency
			}
		}
	}

	c := node.Get(Children)
	subDuration, err := analyzeDurationNodes(c, concurrency, copConcurrency, tableConcurrency)
	if err != nil {
		return 0, concurrency, copConcurrency, tableConcurrency, err
	}

	if duration < subDuration {
		duration = subDuration
	}

	// set
	node.Set(Duration, duration.String())

	return duration, concurrency, copConcurrency, tableConcurrency, nil
}

// analyzeDurationNodes return max(node.duration).
func analyzeDurationNodes(noeds *simplejson.Json, concurrency, copConcurrency, tableConcurrency int) (time.Duration, error) {
	length := len(noeds.MustArray())

	// no children nodes
	if length == 0 {
		return 0, nil
	}

	var durations []time.Duration
	for i := 0; i < length; i++ {
		var d time.Duration
		var err error
		c := noeds.GetIndex(i)
		d, _, _, _, err = analyzeDurationNode(c, concurrency, copConcurrency, tableConcurrency)
		if err != nil {
			return 0, err
		}
		durations = append(durations, d)
	}

	// get max duration
	sort.Slice(durations, func(p, q int) bool {
		return durations[p] > durations[q]
	})

	return durations[0], nil
}

func formatBinaryPlanJSON(bp []byte) ([]byte, error) {
	// new simple json
	vp, err := simplejson.NewJson(bp)
	if err != nil {
		return nil, err
	}

	// main
	err = formatNode(vp.Get(MainTree))
	if err != nil {
		return nil, err
	}

	// ctes
	err = formatChildrenNodes(vp.Get(CteTrees))
	if err != nil {
		return nil, err
	}

	return vp.MarshalJSON()
}

func formatNode(node *simplejson.Json) error {
	// format
	for _, key := range needSetNA {
		if node.Get(key).MustString() == "-1" {
			node.Set(key, "N/A")
		}
	}
	var err error

	// I don't want to do that either, but have to convert the irregular string to json
	for _, key := range needJSONFormat {
		if key == RootGroupExecInfo {
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
	err = formatChildrenNodes(c)
	if err != nil {
		return err
	}

	return nil
}

func formatChildrenNodes(noeds *simplejson.Json) error {
	length := len(noeds.MustArray())

	// no children nodes
	if length == 0 {
		return nil
	}

	for i := 0; i < length; i++ {
		c := noeds.GetIndex(i)
		err := formatNode(c)
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
