// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import "testing"

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
