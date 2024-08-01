// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package model

import (
	"testing"

	"github.com/pingcap/check"
)

func TestTable(t *testing.T) {
	check.TestingT(t)
}

var _ = check.Suite(&testCodecSuite{})

type testCodecSuite struct{}

func (s *testCodecSuite) TestDecodeBytes(c *check.C) {
	key := "abcdefghijklmnopqrstuvwxyz"
	for i := 0; i < len(key); i++ {
		_, k, err := decodeBytes(encodeBytes([]byte(key[:i])), nil)
		c.Assert(err, check.IsNil)
		c.Assert(string(k), check.Equals, key[:i])
	}
}

func (s *testCodecSuite) TestTiDBInfo(c *check.C) {
	buf := new(KeyInfoBuffer)

	// no encode
	_, err := buf.DecodeKey([]byte("t\x80\x00\x00\x00\x00\x00\x00\xff"))
	c.Assert(err, check.NotNil)

	testcases := []struct {
		Key            string
		IsMeta         bool
		TableID        int64
		IsCommonHandle bool
		RowID          int64
		IndexID        int64
	}{
		{
			"T\x00\x00\x00\x00\x00\x00\x00\xff",
			false,
			0,
			false,
			0,
			0,
		},
		{
			"t\x80\x00\x00\x00\x00\x00\xff",
			false,
			0,
			false,
			0,
			0,
		},
		{
			"t\x80\x00\x00\x00\x00\x00\x00\xff",
			false,
			0xff,
			false,
			0,
			0,
		},
		{
			"t\x80\x00\x00\x00\x00\x00\x00\xff_i\x01\x02",
			false,
			0xff,
			false,
			0,
			0,
		},
		{
			"t\x80\x00\x00\x00\x00\x00\x00\xff_i\x80\x00\x00\x00\x00\x00\x00\x02",
			false,
			0xff,
			false,
			0,
			2,
		},
		{
			"t\x80\x00\x00\x00\x00\x00\x00\xff_r\x80\x00\x00\x00\x00\x00\x00\x02",
			false,
			0xff,
			false,
			2,
			0,
		},
		{
			"t\x80\x00\x00\x00\x00\x00\x00\xff_r\x03\x80\x00\x00\x00\x00\x02\r\xaf\x03\x80\x00\x00\x00\x00\x00\x00\x03\x03\x80\x00\x00\x00\x00\x00\b%",
			false,
			0xff,
			true,
			0,
			0,
		},
	}

	for _, t := range testcases {
		key := encodeBytes([]byte(t.Key))
		_, err := buf.DecodeKey(key)
		c.Assert(err, check.IsNil)
		isMeta, tableID := buf.MetaOrTable()
		c.Assert(isMeta, check.Equals, t.IsMeta)
		c.Assert(tableID, check.Equals, t.TableID)
		isCommonHandle, rowID := buf.RowInfo()
		c.Assert(isCommonHandle, check.Equals, t.IsCommonHandle)
		c.Assert(rowID, check.Equals, t.RowID)
		indexID := buf.IndexInfo()
		c.Assert(indexID, check.Equals, t.IndexID)
	}
}
