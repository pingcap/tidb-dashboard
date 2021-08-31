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
	"testing"

	. "github.com/pingcap/check"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

func TestRequest(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testRequestSuite{})

type testRequestSuite struct{}

func (t *testClientSuite) Test_Path(c *C) {
	req := NewRequest(model.NodeKindTiDB, MethodGet, "127.0.0.1", 10080, "/test/{foo}")
	req.PathValues.Set("foo", "bar")

	c.Assert(req.Path(), Equals, "/test/bar")
}

func (t *testClientSuite) Test_Query(c *C) {
	req := NewRequest(model.NodeKindTiDB, MethodGet, "127.0.0.1", 10080, "/test")
	req.QueryValues.Set("foo", "bar")
	req.QueryValues.Add("foo", "?bar,")

	c.Assert(req.Query(), Equals, "foo=bar&foo=%3Fbar%2C")
}
