// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package topology

import (
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.etcd.io/etcd/api/v3/mvccpb"
)

func TestParseNgMonitoringTopology(t *testing.T) {
	kvs := []*mvccpb.KeyValue{
		{
			Key:   []byte("/topology/ng-monitoring/10.0.1.8:12020/info"),
			Value: []byte(`{"dashboard_auth":{"scheme":"token-v1","token":"test-token"},"future_field":true}`),
		},
		{
			Key:   []byte("/topology/ng-monitoring/10.0.1.8:12020/ttl"),
			Value: []byte(strconv.FormatInt(time.Now().UnixNano(), 10)),
		},
	}

	info, err := parseNgMonitoringTopology(kvs)
	require.NoError(t, err)
	require.Equal(t, "10.0.1.8:12020", info.Address)
	require.Equal(t, "test-token", info.DashboardAuthToken)
}

func TestParseOldNgMonitoringTopology(t *testing.T) {
	kvs := []*mvccpb.KeyValue{
		{
			Key:   []byte("/topology/ng-monitoring/10.0.1.8:12020/info"),
			Value: []byte(`{"git_hash":"old-version"}`),
		},
		{
			Key:   []byte("/topology/ng-monitoring/10.0.1.8:12020/ttl"),
			Value: []byte(strconv.FormatInt(time.Now().UnixNano(), 10)),
		},
	}

	info, err := parseNgMonitoringTopology(kvs)
	require.NoError(t, err)
	require.Equal(t, "10.0.1.8:12020", info.Address)
	require.Empty(t, info.DashboardAuthToken)
}

func TestParseNgMonitoringTopologyRejectsUnknownAuthScheme(t *testing.T) {
	kvs := []*mvccpb.KeyValue{
		{
			Key:   []byte("/topology/ng-monitoring/10.0.1.8:12020/info"),
			Value: []byte(`{"dashboard_auth":{"scheme":"future-scheme","token":"test-token"}}`),
		},
		{
			Key:   []byte("/topology/ng-monitoring/10.0.1.8:12020/ttl"),
			Value: []byte(strconv.FormatInt(time.Now().UnixNano(), 10)),
		},
	}

	_, err := parseNgMonitoringTopology(kvs)
	require.Error(t, err)
}
