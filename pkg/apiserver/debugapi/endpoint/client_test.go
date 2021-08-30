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
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/joomcode/errorx"
	. "github.com/pingcap/check"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
)

func TestClient(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testClientSuite{})

type testClientSuite struct{}

type testDispatcher struct{}

func (d *testDispatcher) Send(req *Request) (*httpc.Response, error) {
	r := httptest.NewRecorder()
	r.WriteString(testCombineReq(req.Host, req.Port, req.Path(), req.Query()))
	return &httpc.Response{Response: r.Result()}, nil
}

func testCombineReq(host string, port int, path, query string) string {
	return fmt.Sprintf("%s:%d%s?%s", host, port, path, query)
}

var testParamModel = NewAPIParamModel("text")
var ep = &APIModelWithMiddleware{APIModel: &APIModel{
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
}}

func (t *testClientSuite) Test_Send(c *C) {
	client := NewClient(&testDispatcher{})
	client.AddEndpoint(ep.APIModel)
	req, err := client.Send(ep.ID, "127.0.0.1", 10080, map[string]string{
		"pathParam":  "foo",
		"queryParam": "bar",
	})
	if err != nil {
		c.Error(err)
	}
	data, _ := req.Body()

	c.Assert(string(data), Equals, testCombineReq("127.0.0.1", 10080, "/test/foo", "queryParam=bar"))
}

func (t *testClientSuite) Test_AddEndpoint(c *C) {
	client := NewClient(&testDispatcher{})

	c.Assert(len(client.endpointList), Equals, 0)
	c.Assert(len(client.endpointMap), Equals, 0)

	client.AddEndpoint(ep.APIModel, MiddlewareHandlerFunc(func(req *Request) error { return nil }))

	c.Assert(len(client.endpointList), Equals, 1)
	c.Assert(len(client.endpointMap), Equals, 1)
}

func (t *testClientSuite) Test_Endpoint(c *C) {
	client := NewClient(&testDispatcher{})
	client.AddEndpoint(ep.APIModel)

	c.Assert(client.Endpoint(ep.ID), Equals, ep.APIModel)
}

func (t *testClientSuite) Test_Endpoints(c *C) {
	client := NewClient(&testDispatcher{})
	client.AddEndpoint(ep.APIModel)

	c.Assert(client.Endpoints()[0].ID, Equals, ep.ID)
}

func (t *testClientSuite) Test_setValues(c *C) {
	client := NewClient(&testDispatcher{})
	req := NewRequest(ep.Component, ep.Method, "127.0.0.1", 10080, ep.Path)
	params := map[string]string{
		"pathParam":  "foo",
		"queryParam": "bar",
	}

	client.setValues(ep, params, req)

	c.Assert(req.PathValues.Get("pathParam"), Equals, params["pathParam"])
	c.Assert(req.QueryValues.Get("queryParam"), Equals, params["queryParam"])
}

func (t *testClientSuite) Test_execMiddlewares(c *C) {
	client := NewClient(&testDispatcher{})
	client.AddEndpoint(ep.APIModel, MiddlewareHandlerFunc(func(req *Request) error {
		req.QueryValues.Set("queryParam", "bar2")
		return nil
	}))
	req, err := client.Send(ep.ID, "127.0.0.1", 10080, map[string]string{
		"pathParam":  "foo",
		"queryParam": "bar",
	})
	if err != nil {
		c.Error(err)
	}
	data, _ := req.Body()

	c.Assert(string(data), Equals, testCombineReq("127.0.0.1", 10080, "/test/foo", "queryParam=bar2"))

	// check required middleware
	_, err = client.Send(ep.ID, "127.0.0.1", 10080, map[string]string{
		"pathParam": "foo",
	})

	c.Assert(errorx.IsOfType(err, ErrInvalidParam), Equals, true)
}
