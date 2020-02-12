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

var _ = Suite(&testUtilSuite{})

type testUtilSuite struct{}

func (s *testUtilSuite) TestMemset(c *C) {
	s1 := []uint64{3, 3, 3, 3, 3}
	s2 := []uint64{0, 0, 0, 0, 0}
	s3 := []int{6, 6, 6, 6}
	s4 := []int{9, 9, 9, 9}

	MemsetUint64(s1, 0)
	MemsetInt(s3, 9)

	c.Assert(s1, DeepEquals, s2)
	c.Assert(s3, DeepEquals, s4)
}
