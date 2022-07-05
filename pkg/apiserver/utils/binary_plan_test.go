// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"testing"

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
}
