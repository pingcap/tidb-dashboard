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

package endpoint

import (
	"fmt"
	"net/http"
	"net/url"
	"testing"

	"github.com/joomcode/errorx"
	. "github.com/pingcap/check"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

func TestParamModels(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testParamModelsSuite{})

type testParamModelsSuite struct{}

func (t *testParamModelsSuite) Test_APIParamModelMultiTags(c *C) {
	testEndpoint := APIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test",
		Method:    http.MethodGet,
		QueryParams: []APIParam{
			{
				Name:  "param1",
				Model: APIParamModelTags,
			},
		},
	}
	value1 := url.QueryEscape("value1,,, ")
	value2 := url.QueryEscape("value2")
	param1 := fmt.Sprintf("%s,%s", value1, value2)

	req, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param1": param1,
	})
	if err == nil {
		c.Assert(req.Query, Equals, fmt.Sprintf("param1=%s&param1=%s", value1, value2))
	} else {
		c.Error(err)
	}
}

func (t *testParamModelsSuite) Test_APIParamModelInt(c *C) {
	testEndpoint := APIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test",
		Method:    http.MethodGet,
		QueryParams: []APIParam{
			{
				Name:  "param1",
				Model: APIParamModelInt,
			},
		},
	}

	value1 := "value1"
	_, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param1": value1,
	})
	c.Log(err)
	c.Assert(errorx.IsOfType(err, ErrInvalidParam), Equals, true)

	value2 := "2"
	req2, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param1": value2,
	})
	if err == nil {
		c.Assert(req2.Query, Equals, fmt.Sprintf("param1=%s", value2))
	} else {
		c.Error(err)
	}
}

func (t *testParamModelsSuite) Test_APIParamModelConstant(c *C) {
	value1 := "value1"
	testEndpoint := APIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test",
		Method:    http.MethodGet,
		QueryParams: []APIParam{
			{
				Name:  "param1",
				Model: APIParamModelConstant(value1),
			},
		},
	}

	req2, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{})
	if err == nil {
		c.Assert(req2.Query, Equals, fmt.Sprintf("param1=%s", value1))
	} else {
		c.Error(err)
	}
}
