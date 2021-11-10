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

package endpoint

import (
	"io/ioutil"
	"net/http"
	"testing"

	. "github.com/pingcap/check"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

func TestParam(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testParamSuite{})

type testParamSuite struct{}

func (t *testParamSuite) Test_Resolve(c *C) {
	testParamModel := &BaseAPIParamModel{
		Type: "test",
		OnResolve: func(value string) ([]string, error) {
			return []string{"test"}, nil
		},
	}
	client := NewClient(&testFetcher{}, []*APIModel{
		{
			ID:        "test_endpoint",
			Component: model.NodeKindTiDB,
			Path:      "/test/{pathParam}",
			Method:    http.MethodGet,
			PathParams: []*APIParam{
				{Model: testParamModel, Name: "pathParam", Required: true},
			},
			QueryParams: []*APIParam{
				{Model: testParamModel, Name: "queryParam", Required: true},
			},
		},
	})
	resp, err := client.Send(&RequestPayload{
		testAPI.ID,
		"127.0.0.1",
		10080,
		map[string]string{
			"pathParam":  "foo",
			"queryParam": "bar",
		},
	})
	if err != nil {
		c.Error(err)
	}
	data, _ := ioutil.ReadAll(resp.RawBody())
	defer resp.RawBody().Close() //nolint:errcheck

	c.Assert(string(data), Equals, testCombineReq("127.0.0.1", 10080, "/test/test", "queryParam=test"))
}
