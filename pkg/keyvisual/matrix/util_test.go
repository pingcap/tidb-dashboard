// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package matrix

import (
	"github.com/pingcap/check"
)

var _ = check.Suite(&testUtilSuite{})

type testUtilSuite struct{}

func (s *testUtilSuite) TestMemset(c *check.C) {
	s1 := []uint64{3, 3, 3, 3, 3}
	s2 := []uint64{0, 0, 0, 0, 0}
	s3 := []int{6, 6, 6, 6}
	s4 := []int{9, 9, 9, 9}

	MemsetUint64(s1, 0)
	MemsetInt(s3, 9)

	c.Assert(s1, check.DeepEquals, s2)
	c.Assert(s3, check.DeepEquals, s4)
}
