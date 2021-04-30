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

var testTiDBIPParam EndpointAPIParam = EndpointAPIParam{
	Name:  "tidb_ip",
	Model: EndpointAPIModelIPPort,
}

var testTiDBStatsDump EndpointAPI = EndpointAPI{
	ID:        "tidb_stats_dump",
	Component: model.NodeKindTiDB,
	Path:      "/stats/dump/{db}/{table}",
	Method:    http.MethodGet,
	Host:      testTiDBIPParam,
	Segment: []EndpointAPIParam{
		{
			Name:  "db",
			Model: EndpointAPIModelText,
		},
		{
			Name:  "table",
			Model: EndpointAPIModelText,
		},
	},
	Query: []EndpointAPIParam{
		{
			Name:  "debug",
			Model: EndpointAPIModelText,
		},
	},
}

func (t *testSchemaSuite) Test_new_request_success(c *C) {
	ip := "127.0.0.1:10080"
	db := "test"
	table := "users"
	debugFlag := "1"

	vals := url.Values{}
	vals.Set("tidb_ip", ip)
	vals.Set("db", db)
	vals.Set("table", table)
	vals.Set("debug", debugFlag)
	req, err := testTiDBStatsDump.NewRequest(vals)

	if err == nil {
		c.Assert(req.URL.String(), Equals, fmt.Sprintf("//%s/stats/dump/%s/%s?debug=%s", ip, db, table, debugFlag))
	} else {
		c.ExpectFailure(err.Error())
	}
}

func (t *testSchemaSuite) Test_new_request_err_param_value_transformed(c *C) {
	ip := "invalidIP"
	db := "test"
	table := "users"

	vals := url.Values{}
	vals.Set("tidb_ip", ip)
	vals.Set("db", db)
	vals.Set("table", table)
	_, err := testTiDBStatsDump.NewRequest(vals)

	c.Assert(errorx.IsOfType(err, ErrValueTransformed), Equals, true)
}
