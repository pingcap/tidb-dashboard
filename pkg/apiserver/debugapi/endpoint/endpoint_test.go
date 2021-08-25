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
	"testing"

	"github.com/joomcode/errorx"
	. "github.com/pingcap/check"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

func TestSchema(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testSchemaSuite{})

type testSchemaSuite struct{}

var testAPIParamModel = NewAPIParamModel("text")

func (t *testSchemaSuite) Test_NewRequest_with_path_param_success(c *C) {
	testEndpoint := APIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test/{param1}",
		Method:    http.MethodGet,
		PathParams: []*APIParam{
			NewAPIParam(testAPIParamModel, "param1", true),
		},
	}
	param1 := "param1"

	req, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param1": param1,
	})
	if err == nil {
		c.Assert(req.Path, Equals, fmt.Sprintf("/test/%s", param1))
	} else {
		c.Error(err)
	}
}

func (t *testSchemaSuite) Test_NewRequest_with_query_param_success(c *C) {
	testEndpoint := APIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test",
		Method:    http.MethodGet,
		QueryParams: []*APIParam{
			NewAPIParam(testAPIParamModel, "param1", false),
			NewAPIParam(testAPIParamModel, "param2", false),
		},
	}
	param1 := "param1"
	param2 := "param2"

	req, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param1": param1,
	})
	if err == nil {
		c.Assert(req.Query, Equals, fmt.Sprintf("param1=%s", param1))
	} else {
		c.Error(err)
	}

	req2, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param1": param1,
		"param2": param2,
	})
	if err == nil {
		c.Assert(req2.Query, Equals, fmt.Sprintf("param1=%s&param2=%s", param1, param2))
	} else {
		c.Error(err)
	}
}

func (t *testSchemaSuite) Test_NewRequest_missing_required_params_err(c *C) {
	testEndpoint := APIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test/{param1}",
		Method:    http.MethodGet,
		PathParams: []*APIParam{
			NewAPIParam(testAPIParamModel, "param1", true),
		},
		QueryParams: []*APIParam{
			NewAPIParam(testAPIParamModel, "param2", true),
		},
	}
	param1 := "param1"
	param2 := "param2"

	// missing path param
	_, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param2": param2,
	})
	c.Log(err)
	c.Assert(errorx.IsOfType(err, ErrInvalidParam), Equals, true)

	// missing required query param
	_, err = testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param1": param1,
	})
	c.Log(err)
	c.Assert(errorx.IsOfType(err, ErrInvalidParam), Equals, true)
}

func (t *testSchemaSuite) Test_NewRequest_validator(c *C) {
	testParamModel := NewAPIParamModel("test").AddValidator(func(ctx *Context) error {
		return fmt.Errorf("test error")
	})
	testEndpoint := APIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test/{param1}",
		Method:    http.MethodGet,
		PathParams: []*APIParam{
			NewAPIParam(testParamModel, "param1", true),
		},
	}

	param1 := "param1"

	_, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param1": param1,
	})
	c.Log(err)
	c.Assert(errorx.IsOfType(err, ErrInvalidParam), Equals, true)
}

func (t *testSchemaSuite) Test_NewRequest_transformer(c *C) {
	testValue := "test_value"
	testParamModel := NewAPIParamModel("test").AddTransformer(func(ctx *Context) error {
		ctx.SetValue(testValue)
		return nil
	})
	testEndpoint := APIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test/{param1}",
		Method:    http.MethodGet,
		PathParams: []*APIParam{
			NewAPIParam(testParamModel, "param1", true),
		},
	}

	param1 := "param1"

	req, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param1": param1,
	})
	if err == nil {
		c.Assert(req.Path, Equals, fmt.Sprintf("/test/%s", testValue))
	} else {
		c.Error(err)
	}
}

func (t *testSchemaSuite) Test_NewRequest_UpdateRequestHandler(c *C) {
	testErr := fmt.Errorf("test error")
	testEndpoint := APIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test",
		Method:    http.MethodGet,
		UpdateRequestHandler: func(req *Request, path, query Values, m *APIModel) error {
			return testErr
		},
	}
	_, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{})
	c.Assert(err, Equals, testErr)

	testEndpoint2 := APIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test",
		Method:    http.MethodGet,
		UpdateRequestHandler: func(req *Request, path, query Values, m *APIModel) error {
			req.Path = "/test2"
			return nil
		},
	}
	req2, err := testEndpoint2.NewRequest("127.0.0.1", 10080, map[string]string{})
	if err == nil {
		c.Assert(req2.Path, DeepEquals, "/test2")
	} else {
		c.Error(err)
	}
}
