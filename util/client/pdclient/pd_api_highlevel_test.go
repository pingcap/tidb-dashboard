// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package pdclient_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/client/pdclient/fixture"
)

func TestAPIClient_HLGetLocationLabels(t *testing.T) {
	apiClient := fixture.NewAPIClientFixture()
	resp, err := apiClient.HLGetLocationLabels(context.Background())
	require.NoError(t, err)
	require.Equal(t, []string{}, resp)
}

func TestAPIClient_HLGetStoreLocations(t *testing.T) {
	apiClient := fixture.NewAPIClientFixture()
	resp, err := apiClient.HLGetStoreLocations(context.Background())
	require.NoError(t, err)
	require.Equal(t, &pdclient.StoreLocations{
		LocationLabels: []string{},
		Stores: []pdclient.StoreLabels{
			{Address: "172.16.5.141:20160", Labels: map[string]string{}},
			{Address: "172.16.5.218:20160", Labels: map[string]string{}},
			{Address: "172.16.6.168:20160", Labels: map[string]string{}},
		},
	}, resp)
}

func TestAPIClient_HLGetStores(t *testing.T) {
	apiClient := fixture.NewAPIClientFixture()
	resp, err := apiClient.HLGetStores(context.Background())
	require.NoError(t, err)
	require.Equal(t, []pdclient.GetStoresResponseStore{
		{
			Address:        "172.16.5.141:20160",
			ID:             1,
			Labels:         nil,
			StateName:      "Up",
			Version:        "4.0.14",
			StatusAddress:  "172.16.5.141:20180",
			GitHash:        "d7dc4fff51ca71c76a928a0780a069efaaeaae70",
			DeployPath:     "/home/tidb/tidb-deploy/tikv-20160/bin",
			StartTimestamp: 1636421301,
		},
		{
			Address:        "172.16.5.218:20160",
			ID:             5,
			Labels:         nil,
			StateName:      "Up",
			Version:        "4.0.14",
			StatusAddress:  "172.16.5.218:20180",
			GitHash:        "d7dc4fff51ca71c76a928a0780a069efaaeaae70",
			DeployPath:     "/home/tidb/tidb-deploy/tikv-20160/bin",
			StartTimestamp: 1636421304,
		},
		{
			Address:        "172.16.6.168:20160",
			ID:             4,
			Labels:         nil,
			StateName:      "Up",
			Version:        "4.0.14",
			StatusAddress:  "172.16.6.168:20180",
			GitHash:        "d7dc4fff51ca71c76a928a0780a069efaaeaae70",
			DeployPath:     "/home/tidb/tidb-deploy/tikv-20160/bin",
			StartTimestamp: 1636421304,
		},
	}, resp)
}
