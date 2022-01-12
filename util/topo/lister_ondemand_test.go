// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestOnDemandLister(t *testing.T) {
	mp := new(MockTopologyProvider)
	mp.
		On("GetPrometheus", mock.Anything).
		Return(&PrometheusInfo{
			IP:   "192.168.35.10",
			Port: 1234,
		}, nil).
		On("GetTiDB", mock.Anything).
		Return([]TiDBInfo{
			{
				IP:         "tidb-2.internal",
				Port:       4000,
				StatusPort: 10080,
			},
			{
				IP:         "tidb-1.internal",
				Port:       4000,
				StatusPort: 10080,
			},
		}, nil).
		On("GetGrafana", mock.Anything).
		Return((*GrafanaInfo)(nil), fmt.Errorf("some error"))

	l := NewOnDemandLister(mp)
	ret, err := l.List(context.Background())
	require.NoError(t, err)
	require.Empty(t, ret)

	l = NewOnDemandLister(mp, KindTiDB, KindPrometheus)
	ret, err = l.List(context.Background())
	require.NoError(t, err)
	require.Len(t, ret, 3)
	require.Equal(t, "tidb-2.internal", ret[0].Descriptor.IP)
	require.Equal(t, "tidb-1.internal", ret[1].Descriptor.IP)
	require.Equal(t, "192.168.35.10", ret[2].Descriptor.IP)

	l = NewOnDemandLister(mp, KindPrometheus, KindGrafana)
	_, err = l.List(context.Background())
	require.Error(t, err)

	mp.AssertExpectations(t)
}
