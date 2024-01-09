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

func TestGetStoreInstances(t *testing.T) {
	apiClient := fixture.NewAPIClientFixture()
	tiKvStores, tiFlashStores, err := pdtopo.GetStoreInstances(context.Background(), apiClient)
	require.NoError(t, err)
	require.Equal(t, []topo.TiKVStoreInfo{
		{
			GitHash:        "d7dc4fff51ca71c76a928a0780a069efaaeaae70",
			Version:        "v4.0.14",
			IP:             "172.16.5.141",
			Port:           20160,
			DeployPath:     "/home/tidb/tidb-deploy/tikv-20160/bin",
			Status:         topo.CompStatusUp,
			StatusPort:     20180,
			Labels:         map[string]string{},
			StartTimestamp: 1636421301,
		},
		{
			GitHash:        "d7dc4fff51ca71c76a928a0780a069efaaeaae70",
			Version:        "v4.0.14",
			IP:             "172.16.5.218",
			Port:           20160,
			DeployPath:     "/home/tidb/tidb-deploy/tikv-20160/bin",
			Status:         topo.CompStatusUp,
			StatusPort:     20180,
			Labels:         map[string]string{},
			StartTimestamp: 1636421304,
		},
		{
			GitHash:        "d7dc4fff51ca71c76a928a0780a069efaaeaae70",
			Version:        "v4.0.14",
			IP:             "172.16.6.168",
			Port:           20160,
			DeployPath:     "/home/tidb/tidb-deploy/tikv-20160/bin",
			Status:         topo.CompStatusUp,
			StatusPort:     20180,
			Labels:         map[string]string{},
			StartTimestamp: 1636421304,
		},
	}, tiKvStores)
	require.Equal(t, []topo.TiFlashStoreInfo{}, tiFlashStores)
}
