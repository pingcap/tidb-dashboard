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

var testTiDBStatsDump EndpointAPIModel = EndpointAPIModel{
	ID:        "tidb_stats_dump",
	Component: model.NodeKindTiDB,
	Path:      "/stats/dump/{db}/{table}",
	Method:    http.MethodGet,
	PathParams: []EndpointAPIParam{
		{
			Name:  "db",
			Model: EndpointAPIParamModelText,
		},
		{
			Name:  "table",
			Model: EndpointAPIParamModelText,
		},
	},
	QueryParams: []EndpointAPIParam{
		{
			Name:     "debug",
			Required: true,
			Model:    EndpointAPIParamModelText,
		},
	},
}

func (t *testSchemaSuite) Test_new_request_success(c *C) {
	db := "test"
	table := "users"
	debugFlag := "1"

	vals := map[string]string{
		"db":    db,
		"table": table,
		"debug": debugFlag,
	}
	req, err := testTiDBStatsDump.NewRequest("127.0.0.1", 10080, vals)

	if err == nil {
		c.Assert(req.Path, Equals, fmt.Sprintf("/stats/dump/%s/%s", db, table))
		c.Assert(req.Query, Equals, fmt.Sprintf("debug=%s", debugFlag))
	} else {
		c.ExpectFailure(err.Error())
	}
}

func (t *testSchemaSuite) Test_new_request_err_missing_required_path_params(c *C) {
	vals := map[string]string{
		"db":    "test",
		"debug": "1",
	}
	_, err := testTiDBStatsDump.NewRequest("127.0.0.1", 10080, vals)

	c.Log(err)
	c.Assert(errorx.IsOfType(err, ErrMissingRequiredParam), Equals, true)
}

func (t *testSchemaSuite) Test_new_request_err_missing_required_query_params(c *C) {
	vals := map[string]string{
		"db":    "test",
		"table": "users",
	}
	_, err := testTiDBStatsDump.NewRequest("127.0.0.1", 10080, vals)

	c.Log(err)
	c.Assert(errorx.IsOfType(err, ErrMissingRequiredParam), Equals, true)
}
