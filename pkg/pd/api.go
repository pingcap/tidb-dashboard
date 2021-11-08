// Copyright 2021 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package pd

import (
	"encoding/json"
	"fmt"

	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
	"github.com/pingcap/tidb-dashboard/pkg/utils/host"
)

func fetchEndpoints(c *Client) (endpoints map[string]struct{}, err error) {
	d, err := FetchMembers(c)
	if err != nil {
		return nil, err
	}

	endpoints = make(map[string]struct{}, len(d.Members))
	for _, m := range d.Members {
		ip, port, _ := host.ParseHostAndPortFromAddressURL(m.ClientUrls[0])
		endpoints[fmt.Sprintf("%s:%d", ip, port)] = struct{}{}
	}
	return
}

type InfoMembers struct {
	Count   int          `json:"count"`
	Members []InfoMember `json:"members"`
}

type InfoMember struct {
	GitHash       string   `json:"git_hash"`
	ClientUrls    []string `json:"client_urls"`
	DeployPath    string   `json:"deploy_path"`
	BinaryVersion string   `json:"binary_version"`
	MemberID      uint64   `json:"member_id"`
}

func FetchMembers(c *Client) (*InfoMembers, error) {
	resp, err := c.WithRawBody(false).unsafeGet("/members")
	if err != nil {
		return nil, err
	}

	ds := &InfoMembers{}
	err = json.Unmarshal(resp.Body, ds)
	if err != nil {
		return nil, ErrPDClientRequestFailed.Wrap(err, "%s members API unmarshal failed", distro.Data("pd"))
	}
	return ds, nil
}
