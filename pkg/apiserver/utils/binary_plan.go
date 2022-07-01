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

// operator.
type operator int

const (
	Default operator = iota
	IndexJoin
	IndexMergeJoin
	IndexHashJoin
	Apply
	Shuffle
	ShuffleReceiver
	IndexLookUpReader
	IndexMergeReader
)

type concurrency struct {
	joinConcurrency    int
	copConcurrency     int
	tableConcurrency   int
	applyConcurrency   int
	shuffleConcurrency int
}

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

func newConcurrency() concurrency {
	return concurrency{
		joinConcurrency:    1,
		copConcurrency:     1,
		tableConcurrency:   1,
		applyConcurrency:   1,
		shuffleConcurrency: 1,
	}
}

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
	mainConcurrency := newConcurrency()
	_, err = analyzeDurationNode(vp.Get(MainTree), mainConcurrency)
	if err != nil {
		return nil, err
	}

	// ctes
	ctesConcurrency := newConcurrency()
	_, err = analyzeDurationNodes(vp.Get(CteTrees), Default, ctesConcurrency)
	if err != nil {
		return nil, err
	}

	return vp.MarshalJSON()
}

// analyzeDurationNode set node.duration.
func analyzeDurationNode(node *simplejson.Json, concurrency concurrency) (time.Duration, error) {
	// get duration time
	ts := node.GetPath(RootBasicExecInfo, "time").MustString()

	// cop task
	if ts == "" {
		ts = getCopTaskDuratuon(node, concurrency)
	} else {
		ts = getOperatorDuratuon(ts, concurrency)
	}

	fmt.Printf("%s %s %v\n", node.Get("name").MustString(), ts, concurrency)

	operator := getOperatorType(node)
	duration, err := time.ParseDuration(ts)
	if err != nil {
		duration = 0
	}
	// get current_node concurrency
	concurrency = getConcurrency(node, operator, concurrency)

	c := node.Get(Children)
	subDuration, err := analyzeDurationNodes(c, operator, concurrency)
	if err != nil {
		return 0, err
	}

	if duration < subDuration {
		duration = subDuration
	}

	// set
	node.Set(Duration, duration.String())

	return duration, nil
}

// analyzeDurationNodes return max(node.duration).
func analyzeDurationNodes(noeds *simplejson.Json, operator operator, concurrency concurrency) (time.Duration, error) {
	length := len(noeds.MustArray())

	// no children nodes
	if length == 0 {
		return 0, nil
	}
	var durations []time.Duration

	if operator == Apply {
		for i := 0; i < length; i++ {
			n := noeds.GetIndex(i)
			if n.Get("driverSide").MustString() == "build" {
				newConcurrency := concurrency
				newConcurrency.applyConcurrency = 1
				d, err := analyzeDurationNode(n, newConcurrency)
				if err != nil {
					return 0, err
				}
				durations = append(durations, d)

				// get probe concurrency
				var cacheHitRatio, actRows float64
				rootGroupInfo := n.Get(RootGroupExecInfo)
				for i := 0; i < len(rootGroupInfo.MustArray()); i++ {
					cacheHitRatioStr := strings.TrimRight(rootGroupInfo.GetIndex(i).Get("cacheHitRatio").MustString(), "%")
					if cacheHitRatioStr == "" {
						continue
					}
					cacheHitRatio, err = strconv.ParseFloat(cacheHitRatioStr, 64)
					if err != nil {
						return 0, err
					}
				}

				actRows, err = strconv.ParseFloat(n.Get("actRows").MustString(), 64)
				if err != nil {
					return 0, err
				}

				taskCount := int(actRows * (1 - cacheHitRatio/100))

				if taskCount < concurrency.applyConcurrency {
					concurrency.applyConcurrency = taskCount
				}

				break
			}
		}

		for i := 0; i < length; i++ {
			n := noeds.GetIndex(i)
			if n.Get("driverSide").MustString() == "probe" {
				d, err := analyzeDurationNode(n, concurrency)
				if err != nil {
					return 0, err
				}
				durations = append(durations, d)
				break
			}
		}
	} else {
		for i := 0; i < length; i++ {
			var d time.Duration
			var err error
			n := noeds.GetIndex(i)

			switch operator {
			case IndexJoin, IndexMergeJoin, IndexHashJoin:
				if n.Get("driverSide").MustString() == "probe" {
					d, err = analyzeDurationNode(n, concurrency)
				} else {
					// build: set joinConcurrency == 1
					newConcurrency := concurrency
					newConcurrency.joinConcurrency = 1
					d, err = analyzeDurationNode(n, newConcurrency)
				}
			case IndexLookUpReader, IndexMergeReader:
				if n.Get("driverSide").MustString() == "probe" {
					d, err = analyzeDurationNode(n, concurrency)
				} else {
					// build: set joinConcurrency == 1
					newConcurrency := concurrency
					newConcurrency.tableConcurrency = 1
					d, err = analyzeDurationNode(n, newConcurrency)
				}
			// concurrency:  suffle -> StreamAgg/Window/MergeJoin ->  Sort -> ShuffleReceiver
			case ShuffleReceiver:
				newConcurrency := concurrency
				newConcurrency.shuffleConcurrency = 1
				d, err = analyzeDurationNode(n, newConcurrency)
			default:
				d, err = analyzeDurationNode(n, concurrency)
			}

			if err != nil {
				return 0, err
			}
			durations = append(durations, d)
		}
	}

	// get max duration
	sort.Slice(durations, func(p, q int) bool {
		return durations[p] > durations[q]
	})

	return durations[0], nil
}

func getOperatorType(node *simplejson.Json) operator {
	operator := node.Get("name").MustString()

	switch {
	case strings.HasPrefix(operator, "IndexJoin"):
		return IndexJoin
	case strings.HasPrefix(operator, "IndexMergeJoin"):
		return IndexMergeJoin
	case strings.HasPrefix(operator, "IndexHashJoin"):
		return IndexHashJoin
	case strings.HasPrefix(operator, "Apply"):
		return Apply
	case strings.HasPrefix(operator, "Shuffle") && !strings.HasPrefix(operator, "ShuffleReceiver"):
		return Shuffle
	case strings.HasPrefix(operator, "ShuffleReceiver"):
		return ShuffleReceiver
	case strings.HasPrefix(operator, "IndexLookUp"):
		return IndexLookUpReader
	case strings.HasPrefix(operator, "IndexMerge"):
		return IndexMergeReader
	default:
		return Default
	}
}

func getConcurrency(node *simplejson.Json, operator operator, concurrency concurrency) concurrency {
	// concurrency, copConcurrency
	rootGroupInfo := node.Get(RootGroupExecInfo)
	rootGroupInfoCount := len(rootGroupInfo.MustArray())
	if rootGroupInfoCount > 0 {
		for i := 0; i < rootGroupInfoCount; i++ {
			switch operator {
			case IndexJoin, IndexMergeJoin, IndexHashJoin:
				tmpJoinConcurrencyStr := rootGroupInfo.GetIndex(i).GetPath("inner", "concurrency").MustString()
				tmpJoinConcurrency, _ := strconv.Atoi(tmpJoinConcurrencyStr)

				joinTaskCountStr := rootGroupInfo.GetIndex(i).GetPath("inner", "task").MustString()
				joinTaskCount, _ := strconv.Atoi(joinTaskCountStr)

				// task count as concurrency
				if joinTaskCount < tmpJoinConcurrency {
					tmpJoinConcurrency = joinTaskCount
				}

				if tmpJoinConcurrency > 0 {
					concurrency.joinConcurrency = tmpJoinConcurrency * concurrency.joinConcurrency
				}

			case Apply:
				tmpApplyConcurrencyStr := rootGroupInfo.GetIndex(i).GetPath("Concurrency").MustString()
				tmpApplyConcurrency, _ := strconv.Atoi(tmpApplyConcurrencyStr)
				if tmpApplyConcurrency > 0 {
					concurrency.applyConcurrency = tmpApplyConcurrency * concurrency.applyConcurrency
				}

			case IndexLookUpReader, IndexMergeReader:
				tmpTableConcurrencyStr := rootGroupInfo.GetIndex(i).GetPath("table_task", "concurrency").MustString()
				tmpTableConcurrency, _ := strconv.Atoi(tmpTableConcurrencyStr)

				tableTaskNumStr := rootGroupInfo.GetIndex(i).GetPath("table_task", "num").MustString()
				tableTaskNum, _ := strconv.Atoi(tableTaskNumStr)
				tableTaskNum = tableTaskNum / concurrency.joinConcurrency
				if tableTaskNum < tmpTableConcurrency {
					tmpTableConcurrency = tableTaskNum
				}

				if tmpTableConcurrency > 0 {
					concurrency.tableConcurrency = tmpTableConcurrency * concurrency.copConcurrency
				}

			case Shuffle:
				tmpSuffleConcurrencyStr := rootGroupInfo.GetIndex(i).Get("ShuffleConcurrency").MustString()
				tmpSuffleConcurrency, _ := strconv.Atoi(tmpSuffleConcurrencyStr)

				if tmpSuffleConcurrency > 0 {
					concurrency.shuffleConcurrency = tmpSuffleConcurrency * concurrency.shuffleConcurrency
				}
			}

			tmpCopConcurrencyStr := rootGroupInfo.GetIndex(i).GetPath("cop_task", "distsql_concurrency").MustString()
			tmpCopConcurrency, _ := strconv.Atoi(tmpCopConcurrencyStr)
			if tmpCopConcurrency > 0 {
				concurrency.copConcurrency = tmpCopConcurrency * concurrency.copConcurrency
			}
		}
	}

	return concurrency
}

func getCopTaskDuratuon(node *simplejson.Json, concurrency concurrency) string {
	storeType := node.GetPath(StoreType).MustString()
	// task == 1
	ts := node.GetPath(CopExecInfo, fmt.Sprintf("%s_task", storeType), "time").MustString()
	if ts == "" {
		switch node.GetPath(TaskType).MustString() {
		case "cop":
			// cop task count
			taskCountStr := node.GetPath(CopExecInfo, fmt.Sprintf("%s_task", storeType), "tasks").MustString()
			taskCount, _ := strconv.Atoi(taskCountStr)
			maxTS := node.GetPath(CopExecInfo, fmt.Sprintf("%s_task", storeType), "proc max").MustString()
			maxDuration, err := time.ParseDuration(maxTS)
			if err != nil {
				ts = maxTS
				break
			}
			avgTS := node.GetPath(CopExecInfo, fmt.Sprintf("%s_task", storeType), "avg").MustString()
			avgDuration, err := time.ParseDuration(avgTS)
			if err != nil {
				ts = maxTS
				break
			}

			var tsDuration time.Duration
			n := float64(taskCount) / float64(
				concurrency.joinConcurrency*concurrency.tableConcurrency*concurrency.applyConcurrency*concurrency.shuffleConcurrency*concurrency.copConcurrency)

			if n > 1 {
				tsDuration = time.Duration(float64(avgDuration) * n)
			} else {
				tsDuration = time.Duration(float64(avgDuration) /
					float64(concurrency.joinConcurrency*concurrency.tableConcurrency*concurrency.applyConcurrency*concurrency.shuffleConcurrency))
			}

			ts = tsDuration.String()

			if tsDuration > maxDuration {

				ts = maxTS
			}
		// tiflash
		case "batchCop", "mpp":
			ts = node.GetPath(CopExecInfo, fmt.Sprintf("%s_task", storeType), "proc max").MustString()
		default:
			ts = "0s"
		}
	}

	return ts
}

func getOperatorDuratuon(ts string, concurrency concurrency) string {
	t, err := time.ParseDuration(ts)
	if err != nil {
		return "0s"
	}

	return time.Duration(float64(t) /
		float64(concurrency.joinConcurrency*concurrency.tableConcurrency*concurrency.applyConcurrency*concurrency.shuffleConcurrency)).
		String()
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
