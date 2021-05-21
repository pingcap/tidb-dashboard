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
	"net/http"
	"net/url"
	"testing"

	"github.com/joomcode/errorx"
	. "github.com/pingcap/check"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

func TestT(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testSchemaSuite{})

type testSchemaSuite struct{}

func (t *testSchemaSuite) Test_NewRequest_with_path_param_success(c *C) {
	testEndpoint := EndpointAPIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test/{param1}",
		Method:    http.MethodGet,
		PathParams: []EndpointAPIParam{
			{
				Name:  "param1",
				Model: EndpointAPIParamModelText,
			},
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
	testEndpoint := EndpointAPIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test",
		Method:    http.MethodGet,
		QueryParams: []EndpointAPIParam{
			{
				Name:  "param1",
				Model: EndpointAPIParamModelText,
			},
			{
				Name:  "param2",
				Model: EndpointAPIParamModelText,
			},
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
	testEndpoint := EndpointAPIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test/{param1}",
		Method:    http.MethodGet,
		PathParams: []EndpointAPIParam{
			{
				Name:  "param1",
				Model: EndpointAPIParamModelText,
			},
		},
		QueryParams: []EndpointAPIParam{
			{
				Name:     "param2",
				Model:    EndpointAPIParamModelText,
				Required: true,
			},
		},
	}
	param1 := "param1"
	param2 := "param2"

	// missing path param
	_, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param2": param2,
	})
	c.Log(err)
	c.Assert(errorx.IsOfType(err, ErrMissingRequiredParam), Equals, true)

	// missing required query param
	_, err = testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param1": param1,
	})
	c.Log(err)
	c.Assert(errorx.IsOfType(err, ErrMissingRequiredParam), Equals, true)
}

func (t *testSchemaSuite) Test_NewRequest_transformer_validation(c *C) {
	testParamModel := EndpointAPIParamModel{
		Type: "test",
		Transformer: func(value string) (string, error) {
			return "", fmt.Errorf("test error")
		},
	}
	testEndpoint := EndpointAPIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test/{param1}",
		Method:    http.MethodGet,
		PathParams: []EndpointAPIParam{
			{
				Name:  "param1",
				Model: testParamModel,
			},
		},
	}

	param1 := "param1"

	_, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{
		"param1": param1,
	})
	c.Log(err)
	c.Assert(errorx.IsOfType(err, ErrInvalidParam), Equals, true)
}

func (t *testSchemaSuite) Test_NewRequest_transformer_transform(c *C) {
	testValue := "test_value"
	testParamModel := EndpointAPIParamModel{
		Type: "test",
		Transformer: func(value string) (string, error) {
			return testValue, nil
		},
	}
	testEndpoint := EndpointAPIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test/{param1}",
		Method:    http.MethodGet,
		PathParams: []EndpointAPIParam{
			{
				Name:  "param1",
				Model: testParamModel,
			},
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

func (t *testSchemaSuite) Test_NewRequest_default_query_value(c *C) {
	testEndpoint := EndpointAPIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test",
		Method:    http.MethodGet,
		QueryParams: []EndpointAPIParam{
			{
				Name:  "param1",
				Model: EndpointAPIParamModelText,
			},
		},
	}
	req, err := testEndpoint.NewRequest("127.0.0.1", 10080, map[string]string{})
	if err == nil {
		c.Assert(req.Query, Equals, "")
	} else {
		c.Error(err)
	}

	defaultValue := "default value"
	testEndpoint2 := EndpointAPIModel{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/test",
		Method:    http.MethodGet,
		QueryParams: []EndpointAPIParam{
			{
				Name:  "param1",
				Model: EndpointAPIParamModelText,
				PreModelTransformer: func(value string) (string, error) {
					if value == "" {
						return defaultValue, nil
					}
					return value, nil
				},
			},
		},
	}
	req2, err := testEndpoint2.NewRequest("127.0.0.1", 10080, map[string]string{})
	if err == nil {
		values, _ := url.ParseQuery(req2.Query)
		values2, _ := url.ParseQuery(fmt.Sprintf("param1=%s", defaultValue))
		c.Assert(values, DeepEquals, values2)
	} else {
		c.Error(err)
	}
}
