// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package fixture

import (
	"github.com/jarcoal/httpmock"

	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/testutil/httpmockutil"
)

const BaseURL = "http://172.16.6.171:2379"

func NewPDServerFixture() (mockTransport *httpmock.MockTransport) {
	mockTransport = httpmock.NewMockTransport()
	mockTransport.RegisterResponder("GET", "http://172.16.6.171:2379/pd/api/v1/status",
		httpmockutil.StringResponder(`
{
  "build_ts": "2021-07-17 05:37:05",
  "version": "v4.0.14",
  "git_hash": "0c1246dd219fd16b4b2ff5108941e5d3e958922d",
  "start_timestamp": 1635762685
}
`))
	mockTransport.RegisterResponder("GET", "http://172.16.6.171:2379/pd/api/v1/health",
		httpmockutil.StringResponder(`
[
  {
    "name": "pd-172.16.6.170-2379",
    "member_id": 2939568762143497195,
    "client_urls": [
      "http://172.16.6.170:2379"
    ],
    "health": true
  },
  {
    "name": "pd-172.16.6.169-2379",
    "member_id": 8776556846936845803,
    "client_urls": [
      "http://172.16.6.169:2379"
    ],
    "health": true
  },
  {
    "name": "pd-172.16.6.171-2379",
    "member_id": 13248060353287547571,
    "client_urls": [
      "http://172.16.6.171:2379"
    ],
    "health": true
  }
]
`))
	mockTransport.RegisterResponder("GET", "http://172.16.6.171:2379/pd/api/v1/members",
		httpmockutil.StringResponder(`
{
  "header": {
    "cluster_id": 6973530669239952773
  },
  "members": [
    {
      "name": "pd-172.16.6.170-2379",
      "member_id": 2939568762143497195,
      "peer_urls": [
        "http://172.16.6.170:2380"
      ],
      "client_urls": [
        "http://172.16.6.170:2379"
      ],
      "deploy_path": "/home/tidb/tidb-deploy/pd-2379/bin",
      "binary_version": "v4.0.14",
      "git_hash": "0c1246dd219fd16b4b2ff5108941e5d3e958922d"
    },
    {
      "name": "pd-172.16.6.169-2379",
      "member_id": 8776556846936845803,
      "peer_urls": [
        "http://172.16.6.169:2380"
      ],
      "client_urls": [
        "http://172.16.6.169:2379"
      ],
      "deploy_path": "/home/tidb/tidb-deploy/pd-2379/bin",
      "binary_version": "v4.0.14",
      "git_hash": "0c1246dd219fd16b4b2ff5108941e5d3e958922d"
    },
    {
      "name": "pd-172.16.6.171-2379",
      "member_id": 13248060353287547571,
      "peer_urls": [
        "http://172.16.6.171:2380"
      ],
      "client_urls": [
        "http://172.16.6.171:2379"
      ],
      "deploy_path": "/home/tidb/tidb-deploy/pd-2379/bin",
      "binary_version": "v4.0.14",
      "git_hash": "0c1246dd219fd16b4b2ff5108941e5d3e958922d"
    }
  ],
  "leader": {
    "name": "pd-172.16.6.171-2379",
    "member_id": 13248060353287547571,
    "peer_urls": [
      "http://172.16.6.171:2380"
    ],
    "client_urls": [
      "http://172.16.6.171:2379"
    ]
  },
  "etcd_leader": {
    "name": "pd-172.16.6.171-2379",
    "member_id": 13248060353287547571,
    "peer_urls": [
      "http://172.16.6.171:2380"
    ],
    "client_urls": [
      "http://172.16.6.171:2379"
    ],
    "deploy_path": "/home/tidb/tidb-deploy/pd-2379/bin",
    "binary_version": "v4.0.14",
    "git_hash": "0c1246dd219fd16b4b2ff5108941e5d3e958922d"
  }
}
`))
	mockTransport.RegisterResponder("GET", "http://172.16.6.171:2379/pd/api/v1/stores",
		httpmockutil.StringResponder(`
{
  "count": 3,
  "stores": [
    {
      "store": {
        "id": 4,
        "address": "172.16.6.168:20160",
        "version": "4.0.14",
        "status_address": "172.16.6.168:20180",
        "git_hash": "d7dc4fff51ca71c76a928a0780a069efaaeaae70",
        "start_timestamp": 1636421304,
        "deploy_path": "/home/tidb/tidb-deploy/tikv-20160/bin",
        "last_heartbeat": 1639400885792220820,
        "state_name": "Up"
      },
      "status": {
        "capacity": "446.8GiB",
        "available": "432.7GiB",
        "used_size": "4.071GiB",
        "leader_count": 51,
        "leader_weight": 1,
        "leader_score": 51,
        "leader_size": 2839,
        "region_count": 141,
        "region_weight": 1,
        "region_score": 6111,
        "region_size": 6111,
        "start_ts": "2021-11-09T09:28:24+08:00",
        "last_heartbeat_ts": "2021-12-13T21:08:05.79222082+08:00",
        "uptime": "827h39m41.79222082s"
      }
    },
    {
      "store": {
        "id": 5,
        "address": "172.16.5.218:20160",
        "version": "4.0.14",
        "status_address": "172.16.5.218:20180",
        "git_hash": "d7dc4fff51ca71c76a928a0780a069efaaeaae70",
        "start_timestamp": 1636421304,
        "deploy_path": "/home/tidb/tidb-deploy/tikv-20160/bin",
        "last_heartbeat": 1639400889610431214,
        "state_name": "Up"
      },
      "status": {
        "capacity": "446.8GiB",
        "available": "432GiB",
        "used_size": "4.07GiB",
        "leader_count": 42,
        "leader_weight": 1,
        "leader_score": 42,
        "leader_size": 1016,
        "region_count": 141,
        "region_weight": 1,
        "region_score": 6111,
        "region_size": 6111,
        "start_ts": "2021-11-09T09:28:24+08:00",
        "last_heartbeat_ts": "2021-12-13T21:08:09.610431214+08:00",
        "uptime": "827h39m45.610431214s"
      }
    },
    {
      "store": {
        "id": 1,
        "address": "172.16.5.141:20160",
        "version": "4.0.14",
        "status_address": "172.16.5.141:20180",
        "git_hash": "d7dc4fff51ca71c76a928a0780a069efaaeaae70",
        "start_timestamp": 1636421301,
        "deploy_path": "/home/tidb/tidb-deploy/tikv-20160/bin",
        "last_heartbeat": 1639400886447728006,
        "state_name": "Up"
      },
      "status": {
        "capacity": "446.8GiB",
        "available": "409.2GiB",
        "used_size": "4.077GiB",
        "leader_count": 48,
        "leader_weight": 1,
        "leader_score": 48,
        "leader_size": 2256,
        "region_count": 141,
        "region_weight": 1,
        "region_score": 6111,
        "region_size": 6111,
        "start_ts": "2021-11-09T09:28:21+08:00",
        "last_heartbeat_ts": "2021-12-13T21:08:06.447728006+08:00",
        "uptime": "827h39m45.447728006s"
      }
    }
  ]
}
`))
	mockTransport.RegisterResponder("GET", "http://172.16.6.171:2379/pd/api/v1/config",
		httpmockutil.StringResponder(`
{
  "client-urls": "http://0.0.0.0:2379",
  "peer-urls": "http://0.0.0.0:2380",
  "advertise-client-urls": "http://172.16.6.171:2379",
  "advertise-peer-urls": "http://172.16.6.171:2380",
  "name": "pd-172.16.6.171-2379",
  "data-dir": "/home/tidb/tidb-data/pd-2379",
  "force-new-cluster": false,
  "enable-grpc-gateway": true,
  "initial-cluster": "pd-172.16.6.169-2379=http://172.16.6.169:2380,pd-172.16.6.170-2379=http://172.16.6.170:2380,pd-172.16.6.171-2379=http://172.16.6.171:2380",
  "initial-cluster-state": "new",
  "initial-cluster-token": "pd-cluster",
  "join": "",
  "lease": 3,
  "log": {
    "level": "",
    "format": "text",
    "disable-timestamp": false,
    "file": {
      "filename": "/home/tidb/tidb-deploy/pd-2379/log/pd.log",
      "max-size": 300,
      "max-days": 0,
      "max-backups": 0
    },
    "development": false,
    "disable-caller": false,
    "disable-stacktrace": false,
    "disable-error-verbose": true,
    "sampling": null
  },
  "tso-save-interval": "3s",
  "metric": {
    "job": "pd-172.16.6.171-2379",
    "address": "",
    "interval": "15s"
  },
  "schedule": {
    "max-snapshot-count": 3,
    "max-pending-peer-count": 16,
    "max-merge-region-size": 20,
    "max-merge-region-keys": 200000,
    "split-merge-interval": "1h0m0s",
    "enable-one-way-merge": "false",
    "enable-cross-table-merge": "false",
    "patrol-region-interval": "100ms",
    "max-store-down-time": "30m0s",
    "leader-schedule-limit": 4,
    "leader-schedule-policy": "count",
    "region-schedule-limit": 2048,
    "replica-schedule-limit": 64,
    "merge-schedule-limit": 8,
    "hot-region-schedule-limit": 4,
    "hot-region-cache-hits-threshold": 3,
    "store-limit": {
      "1": {
        "add-peer": 15,
        "remove-peer": 15
      },
      "4": {
        "add-peer": 15,
        "remove-peer": 15
      },
      "5": {
        "add-peer": 15,
        "remove-peer": 15
      }
    },
    "tolerant-size-ratio": 0,
    "low-space-ratio": 0.8,
    "high-space-ratio": 0.7,
    "scheduler-max-waiting-operator": 5,
    "enable-remove-down-replica": "true",
    "enable-replace-offline-replica": "true",
    "enable-make-up-replica": "true",
    "enable-remove-extra-replica": "true",
    "enable-location-replacement": "true",
    "enable-debug-metrics": "false",
    "schedulers-v2": [
      {
        "type": "balance-region",
        "args": null,
        "disable": false,
        "args-payload": ""
      },
      {
        "type": "balance-leader",
        "args": null,
        "disable": false,
        "args-payload": ""
      },
      {
        "type": "hot-region",
        "args": null,
        "disable": false,
        "args-payload": ""
      },
      {
        "type": "label",
        "args": null,
        "disable": false,
        "args-payload": ""
      }
    ],
    "schedulers-payload": {
      "balance-hot-region-scheduler": null,
      "balance-leader-scheduler": {
        "name": "balance-leader-scheduler",
        "ranges": [
          {
            "end-key": "",
            "start-key": ""
          }
        ]
      },
      "balance-region-scheduler": {
        "name": "balance-region-scheduler",
        "ranges": [
          {
            "end-key": "",
            "start-key": ""
          }
        ]
      },
      "label-scheduler": {
        "name": "label-scheduler",
        "ranges": [
          {
            "end-key": "",
            "start-key": ""
          }
        ]
      }
    },
    "store-limit-mode": "manual"
  },
  "replication": {
    "max-replicas": 3,
    "location-labels": "",
    "strictly-match-label": "false",
    "enable-placement-rules": "false"
  },
  "pd-server": {
    "use-region-storage": "true",
    "max-gap-reset-ts": "24h0m0s",
    "key-type": "table",
    "runtime-services": "",
    "metric-storage": "",
    "dashboard-address": "http://172.16.6.169:2379",
    "trace-region-flow": "true"
  },
  "cluster-version": "4.0.14",
  "quota-backend-bytes": "8GiB",
  "auto-compaction-mode": "periodic",
  "auto-compaction-retention-v2": "1h",
  "TickInterval": "500ms",
  "ElectionInterval": "3s",
  "PreVote": true,
  "security": {
    "cacert-path": "",
    "cert-path": "",
    "key-path": "",
    "cert-allowed-cn": null
  },
  "label-property": {},
  "WarningMsgs": null,
  "DisableStrictReconfigCheck": false,
  "HeartbeatStreamBindInterval": "1m0s",
  "LeaderPriorityCheckInterval": "1m0s",
  "dashboard": {
    "tidb-cacert-path": "",
    "tidb-cert-path": "",
    "tidb-key-path": "",
    "public-path-prefix": "",
    "internal-proxy": false,
    "enable-telemetry": true,
    "enable-experimental": false
  },
  "replication-mode": {
    "replication-mode": "majority",
    "dr-auto-sync": {
      "label-key": "",
      "primary": "",
      "dr": "",
      "primary-replicas": 0,
      "dr-replicas": 0,
      "wait-store-timeout": "1m0s",
      "wait-sync-timeout": "1m0s"
    }
  },
  "enable-redact-log": false
}
`))
	mockTransport.RegisterResponder("GET", "http://172.16.6.171:2379/pd/api/v1/config/replicate",
		httpmockutil.StringResponder(`
{
  "max-replicas": 3,
  "location-labels": "",
  "strictly-match-label": "false",
  "enable-placement-rules": "false"
}
`))
	return
}

// NewAPIClientFixture returns a PD client whose default Base URL is pointing to a mock PD server.
func NewAPIClientFixture() *pdclient.APIClient {
	mockTransport := NewPDServerFixture()
	apiClient := pdclient.NewAPIClient(httpclient.Config{})
	apiClient.SetDefaultBaseURL(BaseURL)
	apiClient.SetDefaultTransport(mockTransport)
	return apiClient
}
