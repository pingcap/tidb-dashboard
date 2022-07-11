// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"testing"

	"github.com/bitly/go-simplejson"
	"github.com/stretchr/testify/assert"
)

var bpTestStr = "SiwKRgoGU2hvd18yKQAFAYjwPzAFOAFAAWoVdGltZTozNC44wrVzLCBsb29wczoygAH//w0COAGIAf///////////wEYAQ=="

func TestGenerateBinaryPlan(t *testing.T) {
	_, err := GenerateBinaryPlan(bpTestStr)
	if err != nil {
		t.Fatalf("generate Visual plan failed: %v", err)
	}
}

func TestGenerateBinaryPlanJson(t *testing.T) {
	_, err := GenerateBinaryPlanJSON(bpTestStr)
	if err != nil {
		t.Fatalf("generate Visual plan failed: %v", err)
	}
}

func TestUseComparisonOperator(t *testing.T) {
	assert.True(t, useComparisonOperator("eq(test.t.a, 1)"))
	assert.False(t, useComparisonOperator("eq(minus(test.t1.b, 1), 1)"))
	assert.True(t, useComparisonOperator("eq(test.t.a, 1), eq(test.t.a, 2)"))
	assert.False(t, useComparisonOperator("eq(test.t.a, 1), eq(test.t.b, 1)"))
	assert.True(t, useComparisonOperator("in(test.t.a, 1, 2, 3, 4)"))
	assert.False(t, useComparisonOperator("in(test.t.a, 1, 2, 3, 4), in(test.t.b, 1, 2, 3, 4)"))
	assert.False(t, useComparisonOperator("in(test.t.a, 1, 2, 3, 4, test.t.b)"))
	assert.True(t, useComparisonOperator("isnull(test2.t1.a)"))
	assert.True(t, useComparisonOperator("not(isnull(test2.t1.a))"))
	assert.False(t, useComparisonOperator("eq(test2.t1.a, test2.t2.a)"))
	assert.True(t, useComparisonOperator("eq(1, test2.t2.a)"))
	assert.False(t, useComparisonOperator("in(test.t.a, 1, 2, test.t.b, 4)"))
	assert.False(t, useComparisonOperator("in(test.t.a, 1, 2, 3, 4), eq(1, test2.t2.a), eq(test.t.a, 1), eq(test.t.a, 2), isnull(test2.t1.a)"))
	assert.True(t, useComparisonOperator("in(test.t.a, 1, 2, 3, 4), eq(1, test.t.a), eq(test.t.a, 1), eq(test.t.a, 2), isnull(test.t.a)"))
	assert.True(t, useComparisonOperator("not(isnull(test2.table1.a))"))
}

func TestFormatJSON(t *testing.T) {
	_, err := formatJSON(`tikv_task:{time:0s, loops:1}, scan_detail: {total_process_keys: 8, total_process_keys_size: 360, total_keys: 9, rocksdb: {delete_skipped_count: 0, key_skipped_count: 8, block: {cache_hit_count: 1, read_count: 0, read_byte: 0 Bytes}}}`)

	assert.Nil(t, err)
}

func TestTooLong(t *testing.T) {
	bp := "AgQgAQ=="
	vp, err := GenerateBinaryPlanJSON(bp)
	assert.Nil(t, err)
	vpJSON, err := simplejson.NewJson([]byte(vp))
	assert.Nil(t, err)

	assert.True(t, vpJSON.Get("discardedDueToTooLong").MustBool())
}

func TestBinaryPlanIsNil(t *testing.T) {
	vp, err := GenerateBinaryPlanJSON("")
	assert.Nil(t, err)
	assert.Len(t, vp, 0)
}
