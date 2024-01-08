// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package pdclient_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/client/pdclient/fixture"
)

func TestAPIClient_GetConfigReplicate(t *testing.T) {
	apiClient := fixture.NewAPIClientFixture()
	resp, err := apiClient.GetConfigReplicate(context.Background())
	require.NoError(t, err)
	require.Equal(t, &pdclient.GetConfigReplicateResponse{
		LocationLabels: "",
	}, resp)
}

func TestAPIClient_GetHealth(t *testing.T) {
	apiClient := fixture.NewAPIClientFixture()
	resp, err := apiClient.GetHealth(context.Background())
	require.NoError(t, err)
	require.Equal(t, &pdclient.GetHealthResponse{
		pdclient.GetHealthResponseMember{MemberID: 0x28cb7236f465dbeb, Health: true},
		pdclient.GetHealthResponseMember{MemberID: 0x79cc97f3bcb16deb, Health: true},
		pdclient.GetHealthResponseMember{MemberID: 0xb7da90b338a3eab3, Health: true},
	}, resp)
}

func TestAPIClient_GetMembers(t *testing.T) {
	apiClient := fixture.NewAPIClientFixture()
	resp, err := apiClient.GetMembers(context.Background())
	require.NoError(t, err)
	require.Equal(t, &pdclient.GetMembersResponse{
		Members: []pdclient.GetMembersResponseMember{
			{
				GitHash:       "0c1246dd219fd16b4b2ff5108941e5d3e958922d",
				ClientUrls:    []string{"http://172.16.6.170:2379"},
				DeployPath:    "/home/tidb/tidb-deploy/pd-2379/bin",
				BinaryVersion: "v4.0.14",
				MemberID:      0x28cb7236f465dbeb,
			}, {
				GitHash:       "0c1246dd219fd16b4b2ff5108941e5d3e958922d",
				ClientUrls:    []string{"http://172.16.6.169:2379"},
				DeployPath:    "/home/tidb/tidb-deploy/pd-2379/bin",
				BinaryVersion: "v4.0.14",
				MemberID:      0x79cc97f3bcb16deb,
			}, {
				GitHash:       "0c1246dd219fd16b4b2ff5108941e5d3e958922d",
				ClientUrls:    []string{"http://172.16.6.171:2379"},
				DeployPath:    "/home/tidb/tidb-deploy/pd-2379/bin",
				BinaryVersion: "v4.0.14",
				MemberID:      0xb7da90b338a3eab3,
			},
		},
	}, resp)
}

func TestAPIClient_GetStatus(t *testing.T) {
	apiClient := fixture.NewAPIClientFixture()
	resp, err := apiClient.GetStatus(context.Background())
	require.NoError(t, err)
	require.Equal(t, &pdclient.GetStatusResponse{
		StartTimestamp: 1635762685,
	}, resp)
}

func TestAPIClient_GetStores(t *testing.T) {
	apiClient := fixture.NewAPIClientFixture()
	resp, err := apiClient.GetStores(context.Background())
	require.NoError(t, err)
	require.Equal(t, &pdclient.GetStoresResponse{
		Stores: []pdclient.GetStoresResponseStoresElem{
			{
				Store: pdclient.GetStoresResponseStore{
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
			},
			{
				Store: pdclient.GetStoresResponseStore{
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
			},
			{
				Store: pdclient.GetStoresResponseStore{
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
			},
		},
	}, resp)
}
