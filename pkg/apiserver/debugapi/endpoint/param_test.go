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
)

func TestParam(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testParamSuite{})

type testParamSuite struct{}

func (t *testParamSuite) Test_Copy(c *C) {
	testParamModel := NewAPIParamModel("text").Use(func(p *ModelParam, ctx *Context) { ctx.Next() })
	testParamModel2 := testParamModel.Copy().Use(func(p *ModelParam, ctx *Context) { ctx.Next() })

	c.Assert(len(testParamModel.Middlewares(nil, false)), Equals, 1)
	c.Assert(len(testParamModel2.Middlewares(nil, false)), Equals, 2)
}
