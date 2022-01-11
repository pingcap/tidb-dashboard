// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCountComponents(t *testing.T) {
	list := []ComponentDescriptor{
		{Kind: KindTiKV},
		{Kind: KindTiFlash},
		{Kind: KindTiDB},
		{Kind: KindPD},
		{Kind: KindTiDB},
		{Kind: KindTiKV},
		{Kind: KindTiKV},
	}
	count := CountComponents(list)
	require.Len(t, count, 4)
	require.Equal(t, count[KindTiFlash], 1)
	require.Equal(t, count[KindTiDB], 2)
	require.Equal(t, count[KindTiKV], 3)
	require.Equal(t, count[KindPD], 1)
}
