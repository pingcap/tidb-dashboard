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
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	. "github.com/pingcap/check"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/schema"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

func TestT(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testDebugapiSuite{})

type testDebugapiSuite struct{}

var tidbIPParam schema.EndpointAPIParam = schema.EndpointAPIParam{
	Name:   "tidb_ip",
	Prefix: "http://",
	Suffix: ":10080",
	Model:  schema.EndpointAPIModelIP,
}

var endpointAPI []schema.EndpointAPI = []schema.EndpointAPI{
	{
		ID:        "tidb_config",
		Component: model.NodeKindTiDB,
		Path:      "/settings",
		Method:    http.MethodGet,
		Host:      tidbIPParam,
	},
	{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/stats/dump/{db}/{table}",
		Method:    http.MethodGet,
		Host: schema.EndpointAPIParam{
			Name: "host",
		},
		Segment: []schema.EndpointAPIParam{
			{
				Name:  "db",
				Model: schema.EndpointAPIModelText,
			},
			{
				Name:  "table",
				Model: schema.EndpointAPIModelText,
			},
		},
	},
}

func (t *testDebugapiSuite) Test_proxy_query_ok(c *C) {
	gin.SetMode(gin.TestMode)
	proxy := newProxy()

	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", fmt.Sprintf("http://%s", endpointAPI[0].ID), nil)
	q := r.URL.Query()
	q.Add("id", endpointAPI[0].ID)
	q.Add("tidb_ip", "127.0.0.1")
	r.URL.RawQuery = q.Encode()

	for _, e := range endpointAPI {
		proxy.SetupEndpoint(e)
	}
	proxy.Server.ServeHTTP(w, r)

	c.Log(w.Body.String())
}

func (t *testDebugapiSuite) Test_get_all_endpoint_configs_success(c *C) {
	gin.SetMode(gin.TestMode)
	service := newService()
	router := gin.New()
	router.GET("/endpoint", service.GetEndpointList)

	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/endpoint", nil)

	router.ServeHTTP(w, r)

	c.Log(w.Body.String())
}
