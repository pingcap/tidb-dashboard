// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package tidbproto

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDecodeBytes(t *testing.T) {
	key := "abcdefghijklmnopqrstuvwxyz"
	for i := 0; i < len(key); i++ {
		_, k, err := decodeBytes(encodeBytes([]byte(key[:i])), nil)
		require.NoError(t, err)
		require.Equal(t, string(k), key[:i])
	}
}

func TestTiDBInfo(t *testing.T) {
	buf := new(KeyInfoBuffer)

	// no encode
	_, err := buf.DecodeKey([]byte("t\x80\x00\x00\x00\x00\x00\x00\xff"))
	require.Error(t, err)

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

	for _, testcase := range testcases {
		key := encodeBytes([]byte(testcase.Key))
		_, err := buf.DecodeKey(key)
		require.NoError(t, err)
		isMeta, tableID := buf.MetaOrTable()
		require.Equal(t, testcase.IsMeta, isMeta)
		require.Equal(t, testcase.TableID, tableID)
		isCommonHandle, rowID := buf.RowInfo()
		require.Equal(t, testcase.IsCommonHandle, isCommonHandle)
		require.Equal(t, testcase.RowID, rowID)
		indexID := buf.IndexInfo()
		require.Equal(t, testcase.IndexID, indexID)
	}
}
