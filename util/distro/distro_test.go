// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package distro

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestR(t *testing.T) {
	require.Equal(t, "TiDB", R().TiDB)
}

func TestReplaceGlobal(t *testing.T) {
	restoreFn := ReplaceGlobal(DistributionResource{
		TiDB: "myTiDB",
		PD:   "",
	})
	require.Equal(t, false, R().IsDistro)
	require.Equal(t, "myTiDB", R().TiDB)
	require.Equal(t, "PD", R().PD)
	require.Equal(t, "TiKV", R().TiKV)
	restoreFn()
	require.Equal(t, "TiDB", R().TiDB)
	require.Equal(t, "PD", R().PD)
	require.Equal(t, "TiKV", R().TiKV)

	restoreFn = ReplaceGlobal(DistributionResource{
		IsDistro: true,
	})
	require.Equal(t, true, R().IsDistro)
	require.Equal(t, "TiDB", R().TiDB)
	require.Equal(t, "PD", R().PD)
	require.Equal(t, "TiKV", R().TiKV)
	restoreFn()
}
