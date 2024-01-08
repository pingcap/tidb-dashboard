// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package metrics

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// https://github.com/pingcap/tidb-dashboard/issues/1560
func Test_normalizeCustomizedPromAddress(t *testing.T) {
	addr, err := normalizeCustomizedPromAddress("http://infra-tidb-monitoring-shadow2-prod-0a01da41:9090")
	require.NoError(t, err)
	require.Equal(t, "http://infra-tidb-monitoring-shadow2-prod-0a01da41:9090", addr)

	addr, err = normalizeCustomizedPromAddress("http://infra-tidb-monitoring-shadow2-prod-0a01da41:9090/")
	require.NoError(t, err)
	require.Equal(t, "http://infra-tidb-monitoring-shadow2-prod-0a01da41:9090", addr)

	addr, err = normalizeCustomizedPromAddress("http://infra-tidb-monitoring-shadow2-prod-0a01da41:9090/_/tsdb/")
	require.NoError(t, err)
	require.Equal(t, "http://infra-tidb-monitoring-shadow2-prod-0a01da41:9090/_/tsdb", addr)
}
