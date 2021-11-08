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
// See the License for the specific language governing permissions and
// limitations under the License.

package debugapi

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/joomcode/errorx"
	. "github.com/pingcap/check"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/endpoint"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

func TestParamModels(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testParamModelsSuite{})

type testParamModelsSuite struct{}

type testFetcher struct{}

func (d *testFetcher) Fetch(req *endpoint.ResolvedRequestPayload) (*http.Response, error) {
	r := httptest.NewRecorder()
	_, _ = r.WriteString(testCombineReq(req.Host, req.Port, req.Path(), req.Query()))
	return r.Result(), nil
}

func testCombineReq(host string, port int, path, query string) string {
	return fmt.Sprintf("%s:%d%s?%s", host, port, path, query)
}

func (t *testParamModelsSuite) Test_APIParamModelMultiTags(c *C) {
	client := endpoint.NewClient(&testFetcher{}, []*endpoint.APIModel{
		{
			ID:        "test_endpoint",
			Component: model.NodeKindTiDB,
			Path:      "/test",
			Method:    http.MethodGet,
			QueryParams: []*endpoint.APIParam{
				{
					Name:  "param1",
					Model: APIParamModelMultiValue,
				},
			},
		},
	})

	resp, err := client.Send(&endpoint.RequestPayload{
		EndpointID: "test_endpoint",
		Host:       "127.0.0.1",
		Port:       10080,
		Params: map[string]string{
			"param1": "value1,value2",
		},
	})
	if err != nil {
		c.Error(err)
	}
	data, _ := ioutil.ReadAll(resp.Body)
	defer resp.Body.Close()

	c.Assert(string(data), Equals, testCombineReq("127.0.0.1", 10080, "/test", fmt.Sprintf("param1=%s&param1=%s", "value1", "value2")))
}

func (t *testParamModelsSuite) Test_APIParamModelInt(c *C) {
	client := endpoint.NewClient(&testFetcher{}, []*endpoint.APIModel{
		{
			ID:        "test_endpoint",
			Component: model.NodeKindTiDB,
			Path:      "/test",
			Method:    http.MethodGet,
			QueryParams: []*endpoint.APIParam{
				{
					Name:  "param1",
					Model: APIParamModelInt,
				},
			},
		},
	})

	_, err := client.Send(&endpoint.RequestPayload{
		EndpointID: "test_endpoint",
		Host:       "127.0.0.1",
		Port:       10080,
		Params: map[string]string{
			"param1": "value1",
		},
	})
	c.Log(err)
	c.Assert(errorx.IsOfType(err, endpoint.ErrInvalidParam), Equals, true)

	resp, err := client.Send(&endpoint.RequestPayload{
		EndpointID: "test_endpoint",
		Host:       "127.0.0.1",
		Port:       10080,
		Params: map[string]string{
			"param1": "2",
		},
	})
	if err != nil {
		c.Error(err)
	}
	data, _ := ioutil.ReadAll(resp.Body)
	defer resp.Body.Close()

	c.Assert(string(data), Equals, testCombineReq("127.0.0.1", 10080, "/test", "param1=2"))
}

func (t *testParamModelsSuite) Test_APIParamModelConstant(c *C) {
	client := endpoint.NewClient(&testFetcher{}, []*endpoint.APIModel{
		{
			ID:        "test_endpoint",
			Component: model.NodeKindTiDB,
			Path:      "/test",
			Method:    http.MethodGet,
			QueryParams: []*endpoint.APIParam{
				{
					Name:  "param1",
					Model: APIParamModelConstant("value1"),
				},
			},
		},
	})

	resp, err := client.Send(&endpoint.RequestPayload{
		EndpointID: "test_endpoint",
		Host:       "127.0.0.1",
		Port:       10080,
		Params:     map[string]string{"param1": "value2"},
	})
	if err != nil {
		c.Error(err)
	}
	data, _ := ioutil.ReadAll(resp.Body)
	defer resp.Body.Close()

	c.Assert(string(data), Equals, testCombineReq("127.0.0.1", 10080, "/test", "param1=value1"))
}

func (t *testParamModelsSuite) Test_APIParamModelEnum(c *C) {
	value1 := "value1"
	client := endpoint.NewClient(&testFetcher{}, []*endpoint.APIModel{
		{
			ID:        "test_endpoint",
			Component: model.NodeKindTiDB,
			Path:      "/test",
			Method:    http.MethodGet,
			QueryParams: []*endpoint.APIParam{
				{
					Name:  "param1",
					Model: APIParamModelEnum([]EnumItem{{Value: value1}}),
				},
			},
		},
	})

	resp, err := client.Send(&endpoint.RequestPayload{
		EndpointID: "test_endpoint",
		Host:       "127.0.0.1",
		Port:       10080,
		Params:     map[string]string{"param1": value1},
	})
	if err != nil {
		c.Error(err)
	}
	data, _ := ioutil.ReadAll(resp.Body)
	defer resp.Body.Close()

	c.Assert(string(data), Equals, testCombineReq("127.0.0.1", 10080, "/test", "param1=value1"))

	// enum validate
	_, err = client.Send(&endpoint.RequestPayload{
		EndpointID: "test_endpoint",
		Host:       "127.0.0.1",
		Port:       10080,
		Params:     map[string]string{"param1": "value2"},
	})

	c.Assert(errorx.IsOfType(err, endpoint.ErrInvalidParam), Equals, true)
}
