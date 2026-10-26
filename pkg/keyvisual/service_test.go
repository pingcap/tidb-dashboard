// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package keyvisual

import "testing"

func TestDecodeKeyRange(t *testing.T) {
	testCases := []struct {
		name     string
		startKey string
		endKey   string
		wantErr  bool
	}{
		{name: "empty range", startKey: "", endKey: ""},
		{name: "unbounded end", startKey: "ff", endKey: ""},
		{name: "ordered lowercase", startKey: "0a", endKey: "0f"},
		{name: "ordered mixed case", startKey: "0a", endKey: "0F"},
		{name: "reversed mixed case", startKey: "0F", endKey: "0a", wantErr: true},
		{name: "equal", startKey: "0a", endKey: "0A", wantErr: true},
		{name: "invalid start hex", startKey: "xyz", endKey: "ff", wantErr: true},
		{name: "invalid end hex", startKey: "00", endKey: "xyz", wantErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			_, _, err := decodeKeyRange(testCase.startKey, testCase.endKey)
			if (err != nil) != testCase.wantErr {
				t.Fatalf("decodeKeyRange(%q, %q) error = %v, wantErr = %v", testCase.startKey, testCase.endKey, err, testCase.wantErr)
			}
		})
	}
}
