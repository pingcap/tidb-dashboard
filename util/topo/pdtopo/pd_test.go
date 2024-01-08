// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package pdtopo_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/client/pdclient/fixture"
	"github.com/pingcap/tidb-dashboard/util/topo"
	"github.com/pingcap/tidb-dashboard/util/topo/pdtopo"
)

func TestGetPDInstances(t *testing.T) {
	apiClient := fixture.NewAPIClientFixture()
	resp, err := pdtopo.GetPDInstances(context.Background(), apiClient)
	require.NoError(t, err)
	require.Equal(t, []topo.PDInfo{
		{
			GitHash:        "0c1246dd219fd16b4b2ff5108941e5d3e958922d",
			Version:        "v4.0.14",
			IP:             "172.16.6.169",
			Port:           2379,
			DeployPath:     "/home/tidb/tidb-deploy/pd-2379/bin",
			Status:         topo.CompStatusUp,
			StartTimestamp: 1635762685,
		},
		{
			GitHash:        "0c1246dd219fd16b4b2ff5108941e5d3e958922d",
			Version:        "v4.0.14",
			IP:             "172.16.6.170",
			Port:           2379,
			DeployPath:     "/home/tidb/tidb-deploy/pd-2379/bin",
			Status:         topo.CompStatusUp,
			StartTimestamp: 1635762685,
		},
		{
			GitHash:        "0c1246dd219fd16b4b2ff5108941e5d3e958922d",
			Version:        "v4.0.14",
			IP:             "172.16.6.171",
			Port:           2379,
			DeployPath:     "/home/tidb/tidb-deploy/pd-2379/bin",
			Status:         topo.CompStatusUp,
			StartTimestamp: 1635762685,
		},
	}, resp)
}
