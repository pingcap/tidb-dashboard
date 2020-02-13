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

package input

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"

	regionpkg "github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/region"
)

// RegionInfo records detail region info for api usage.
type RegionInfo struct {
	ID              uint64 `json:"id"`
	StartKey        string `json:"start_key"`
	EndKey          string `json:"end_key"`
	WrittenBytes    uint64 `json:"written_bytes"`
	ReadBytes       uint64 `json:"read_bytes"`
	WrittenKeys     uint64 `json:"written_keys"`
	ReadKeys        uint64 `json:"read_keys"`
	ApproximateSize int64  `json:"approximate_size"`
	ApproximateKeys int64  `json:"approximate_keys"`
}

// RegionsInfo contains some regions with the detailed region info.
type RegionsInfo struct {
	Count   int           `json:"count"`
	Regions []*RegionInfo `json:"regions"`
}

func (rs *RegionsInfo) Len() int {
	return rs.Count
}

func (rs *RegionsInfo) GetKeys() []string {
	keys := make([]string, rs.Count+1)
	keys[0] = rs.Regions[0].StartKey
	endKeys := keys[1:]
	for i, region := range rs.Regions {
		endKeys[i] = region.EndKey
	}
	return keys
}

func (rs *RegionsInfo) GetValues(tag regionpkg.StatTag) []uint64 {
	values := make([]uint64, rs.Count)
	switch tag {
	case regionpkg.WrittenBytes:
		for i, region := range rs.Regions {
			values[i] = region.WrittenBytes
		}
	case regionpkg.ReadBytes:
		for i, region := range rs.Regions {
			values[i] = region.ReadBytes
		}
	case regionpkg.WrittenKeys:
		for i, region := range rs.Regions {
			values[i] = region.WrittenKeys
		}
	case regionpkg.ReadKeys:
		for i, region := range rs.Regions {
			values[i] = region.ReadKeys
		}
	case regionpkg.Integration:
		for i, region := range rs.Regions {
			values[i] = region.WrittenBytes + region.ReadBytes
		}
	default:
		panic("unreachable")
	}
	return values
}

func read(stream io.ReadCloser) (*RegionsInfo, error) {
	defer stream.Close()
	regions := &RegionsInfo{}
	decoder := json.NewDecoder(stream)
	err := decoder.Decode(regions)
	if err == nil {
		var startBytes, endBytes []byte
		for _, region := range regions.Regions {
			startBytes, err = hex.DecodeString(region.StartKey)
			if err != nil {
				break
			}
			endBytes, err = hex.DecodeString(region.EndKey)
			if err != nil {
				break
			}
			region.StartKey = regionpkg.String(startBytes)
			region.EndKey = regionpkg.String(endBytes)
		}
	}
	if err == nil {
		sort.Slice(regions.Regions, func(i, j int) bool {
			return regions.Regions[i].StartKey < regions.Regions[j].StartKey
		})
	}
	return regions, err
}

func NewAPIPeriodicGetter(pdAddr string) regionpkg.RegionsInfoGenerator {
	addr := fmt.Sprintf("%s/pd/api/v1/regions", pdAddr)
	return func() (regionsInfo regionpkg.RegionsInfo, err error) {
		resp, err := http.Get(addr) //nolint:bodyclose,gosec
		if err == nil {
			return read(resp.Body)
		}
		return nil, err
	}
}
