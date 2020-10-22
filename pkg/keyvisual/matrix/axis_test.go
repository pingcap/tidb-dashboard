// Copyright 2019 PingCAP, Inc.
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

package matrix

import (
	. "github.com/pingcap/check"
)

var _ = Suite(&testAxisSuite{})

type testAxisSuite struct{}

func (s *testAxisSuite) TestChunkReduce(c *C) {
	testcases := []struct {
		keys      []string
		values    []uint64
		newKeys   []string
		newValues []uint64
	}{
		{
			[]string{"", "a", "b", "c", ""},
			[]uint64{1, 10, 100, 1000},
			[]string{"", "b", ""},
			[]uint64{11, 1100},
		},
		{
			[]string{"", "a", "b", "c", ""},
			[]uint64{1, 10, 100, 1000},
			[]string{"", ""},
			[]uint64{1111},
		},
	}

	for _, testcase := range testcases {
		originChunk := createChunk(testcase.keys, testcase.values)
		reduceChunk := originChunk.Reduce(testcase.newKeys)
		c.Assert(reduceChunk.Values, DeepEquals, testcase.newValues)
	}
}
