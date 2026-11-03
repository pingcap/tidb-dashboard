// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"encoding/base64"
	"encoding/binary"
	"strings"
	"testing"

	"github.com/golang/snappy"
	"github.com/pingcap/tipb/go-tipb"
	"github.com/stretchr/testify/require"
)

func TestGenerateBinaryPlanRejectsOversizedHeader(t *testing.T) {
	for _, size := range []uint64{maxDecodedBinaryPlanSize + 1, 1<<32 - 1} {
		var header [binary.MaxVarintLen64]byte
		n := binary.PutUvarint(header[:], size)
		_, err := GenerateBinaryPlan(base64.StdEncoding.EncodeToString(header[:n]))
		require.ErrorContains(t, err, "decoded binary plan exceeds")
	}
}

func TestGenerateBinaryPlanAcceptsLargeValidPlan(t *testing.T) {
	plan := &tipb.ExplainData{Main: &tipb.ExplainOperator{
		OperatorInfo: strings.Repeat("valid plan information ", 100000),
	}}
	data, err := plan.Marshal()
	require.NoError(t, err)
	encoded := base64.StdEncoding.EncodeToString(snappy.Encode(nil, data))
	actual, err := GenerateBinaryPlan(encoded)
	require.NoError(t, err)
	require.Equal(t, plan, actual)
}

func TestGenerateBinaryPlanRejectsCorruptInput(t *testing.T) {
	for _, input := range []string{"not base64", "gA==", "AQ=="} {
		_, err := GenerateBinaryPlan(input)
		require.Error(t, err)
	}
	plan, err := GenerateBinaryPlan("")
	require.NoError(t, err)
	require.Nil(t, plan)
}
