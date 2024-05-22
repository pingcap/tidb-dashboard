import {
  ColorType,
  TransformNullValue,
  MetricsQueryType
} from '@pingcap/tidb-dashboard-lib'

import { compare } from 'compare-versions'

function transformColorBySQLType(legendLabel: string) {
  switch (legendLabel) {
    case 'Select':
      return ColorType.BLUE_3
    case 'Commit':
      return ColorType.GREEN_2
    case 'Insert':
      return ColorType.GREEN_3
    case 'Update':
      return ColorType.GREEN_4
    case 'general':
      return ColorType.PINK
    default:
      return undefined
  }
}

function transformColorByExecTimeOverview(legendLabel: string) {
  switch (legendLabel) {
    case 'tso_wait':
      return ColorType.RED_5
    case 'Commit':
      return ColorType.GREEN_4
    case 'Prewrite':
      return ColorType.GREEN_3
    case 'PessimisticLock':
      return ColorType.RED_4
    case 'Get':
      return ColorType.BLUE_3
    case 'BatchGet':
      return ColorType.BLUE_4
    case 'Cop':
      return ColorType.BLUE_1
    case 'ScanLock':
    case 'Scan':
      return ColorType.PURPLE
    case 'execute time':
      return ColorType.YELLOW
    default:
      return undefined
  }
}

const getMonitoringItems = (
  pdVersion: string | undefined
): MetricsQueryType[] => {
  function loadTiKVStoragePromql() {
    const PDVersion = pdVersion?.replace('v', '')

    if (PDVersion && PDVersion !== 'N/A' && compare(PDVersion, '5.4.1', '<')) {
      return 'sum(tikv_engine_size_bytes) by (instance)'
    }
    return 'sum(tikv_store_size_bytes{type="used"}) by (instance)'
  }

  const monitoringItems: MetricsQueryType[] = [
    {
      category: 'database_time',
      metrics: [
        {
          title: 'Database Time by SQL Types',
          queries: [
            {
              promql: `sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval]))`,
              name: 'database time',
              color: ColorType.YELLOW,
              type: 'line'
            },
            {
              promql: `sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval])) by (sql_type)`,
              name: '{sql_type}',
              color: (seriesName: string) =>
                transformColorBySQLType(seriesName),
              type: 'bar_stacked'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'Database Time by SQL Phase',
          queries: [
            {
              promql: `sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval]))`,
              name: 'database time',
              color: ColorType.YELLOW,
              type: 'line'
            },
            {
              promql: `sum(rate(tidb_session_parse_duration_seconds_sum{sql_type="general"}[$__rate_interval]))`,
              name: 'parse',
              color: ColorType.RED_2,
              type: 'bar_stacked'
            },
            {
              promql: `sum(rate(tidb_session_compile_duration_seconds_sum{sql_type="general"}[$__rate_interval]))`,
              name: 'compile',
              color: ColorType.ORANGE,
              type: 'bar_stacked'
            },
            {
              promql: `sum(rate(tidb_session_execute_duration_seconds_sum{sql_type="general"}[$__rate_interval]))`,
              name: 'execute',
              color: ColorType.GREEN_3,
              type: 'bar_stacked'
            },
            {
              promql: `sum(rate(tidb_server_get_token_duration_seconds_sum[$__rate_interval]))/1000000`,
              name: 'get token',
              color: ColorType.RED_3,
              type: 'bar_stacked'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'SQL Execute Time Overview',
          queries: [
            {
              promql:
                'sum(rate(tidb_tikvclient_request_seconds_sum{store!="0"}[$__rate_interval])) by (type)',
              name: '{type}',
              color: (seriesName: string) =>
                transformColorByExecTimeOverview(seriesName),
              type: 'bar_stacked'
            },
            {
              promql:
                'sum(rate(pd_client_cmd_handle_cmds_duration_seconds_sum{type="wait"}[$__rate_interval]))',
              name: 'tso_wait',
              color: ColorType.RED_5,
              type: 'bar_stacked'
            }
          ],
          unit: 's'
        }
      ]
    },
    {
      category: 'application_connection',
      metrics: [
        {
          title: 'Connection Count',
          queries: [
            {
              promql: 'sum(tidb_server_connections)',
              name: 'Total',
              type: 'line'
            },
            {
              promql: 'sum(tidb_server_tokens)',
              name: 'active connections',
              type: 'line'
            }
          ],
          unit: 'short',
          nullValue: TransformNullValue.AS_ZERO
        },
        {
          title: 'Disconnection',
          queries: [
            {
              promql:
                'sum(rate(tidb_server_disconnection_total[$__rate_interval])) by (instance, result)',
              name: '{instance}-{result}',
              type: 'area_stack'
            }
          ],
          unit: 'short',
          nullValue: TransformNullValue.AS_ZERO
        }
      ]
    },
    {
      category: 'sql_count',
      metrics: [
        {
          title: 'Query Per Second',
          queries: [
            {
              promql:
                'sum(rate(tidb_executor_statement_total[$__rate_interval]))',
              name: 'Total',
              type: 'line'
            },
            {
              promql:
                'sum(rate(tidb_executor_statement_total[$__rate_interval])) by (type)',
              name: '{type}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 'short'
        },
        {
          title: 'Failed Queries',
          queries: [
            {
              promql:
                'sum(rate(tidb_server_execute_error_total[$__rate_interval]))',
              name: '{type} @ {instance}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 'short'
        },
        {
          title: 'Command Per Second',
          queries: [
            {
              promql:
                'sum(rate(tidb_server_query_total[$__rate_interval])) by (type)',
              name: '{type}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 'short'
        },
        {
          title: 'Queries Using Plan Cache OPS',
          queries: [
            {
              promql:
                'sum(rate(tidb_server_plan_cache_total[$__rate_interval]))',
              name: 'avg - hit',
              type: 'line'
            },
            {
              promql:
                'sum(rate(tidb_server_plan_cache_miss_total[$__rate_interval]))',
              name: 'avg - miss',
              type: 'line'
            }
          ],
          unit: 'short',
          nullValue: TransformNullValue.AS_ZERO
        }
      ]
    },
    {
      category: 'latency_break_down',
      metrics: [
        {
          title: 'Query Duration',
          queries: [
            {
              promql:
                'sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval])) / sum(rate(tidb_server_handle_query_duration_seconds_count{sql_type!="internal"}[$__rate_interval]))',
              name: 'avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket{sql_type!="internal"}[$__rate_interval])) by (le))',
              name: '99',
              type: 'line'
            },
            {
              promql:
                'sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval])) by (sql_type) / sum(rate(tidb_server_handle_query_duration_seconds_count{sql_type!="internal"}[$__rate_interval])) by (sql_type)',
              name: 'avg-{sql_type}',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket[$__rate_interval])) by (le,sql_type))',
              name: '99-{sql_type}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'Average Idle Connection Duration',
          queries: [
            {
              promql: `(sum(rate(tidb_server_conn_idle_duration_seconds_sum{in_txn='1'}[$__rate_interval])) / sum(rate(tidb_server_conn_idle_duration_seconds_count{in_txn='1'}[$__rate_interval])))`,
              name: 'avg-in-txn',
              type: 'line'
            },
            {
              promql: `(sum(rate(tidb_server_conn_idle_duration_seconds_sum{in_txn='0'}[$__rate_interval])) / sum(rate(tidb_server_conn_idle_duration_seconds_count{in_txn='0'}[$__rate_interval])))`,
              name: 'avg-not-in-txn',
              type: 'line'
            }
          ],
          unit: 's',
          nullValue: TransformNullValue.AS_ZERO
        },
        {
          title: 'Get Token Duration',
          queries: [
            {
              promql:
                'sum(rate(tidb_server_get_token_duration_seconds_sum[$__rate_interval])) / sum(rate(tidb_server_get_token_duration_seconds_count[$__rate_interval]))',
              name: 'avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tidb_server_get_token_duration_seconds_bucket[$__rate_interval])) by (le))',
              name: '99',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 'µs'
        },
        {
          title: 'Parse Duration',
          queries: [
            {
              promql:
                '(sum(rate(tidb_session_parse_duration_seconds_sum{sql_type="general"}[$__rate_interval])) / sum(rate(tidb_session_parse_duration_seconds_count{sql_type="general"}[$__rate_interval])))',
              name: 'avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tidb_session_parse_duration_seconds_bucket{sql_type="general"}[$__rate_interval])) by (le))',
              name: '99',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'Compile Duration',
          queries: [
            {
              promql:
                '(sum(rate(tidb_session_compile_duration_seconds_sum{sql_type="general"}[$__rate_interval])) / sum(rate(tidb_session_compile_duration_seconds_count{sql_type="general"}[$__rate_interval])))',
              name: 'avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tidb_session_compile_duration_seconds_bucket{sql_type="general"}[$__rate_interval])) by (le))',
              name: '99',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'Execute Duration',
          queries: [
            {
              promql:
                '(sum(rate(tidb_session_execute_duration_seconds_sum{sql_type="general"}[$__rate_interval])) / sum(rate(tidb_session_execute_duration_seconds_count{sql_type="general"}[$__rate_interval])))',
              name: 'avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tidb_session_execute_duration_seconds_bucket{sql_type="general"}[$__rate_interval])) by (le))',
              name: '99',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        }
      ]
    },
    {
      category: 'transaction',
      metrics: [
        {
          title: 'Transaction Per Second',
          queries: [
            {
              promql:
                'sum(rate(tidb_session_transaction_duration_seconds_count{scope=~"general"}[$__rate_interval])) by (type, txn_mode)',
              name: '{type}-{txn_mode}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 'short'
        },
        {
          title: 'Transaction Duration',
          queries: [
            {
              promql:
                'sum(rate(tidb_session_transaction_duration_seconds_sum{scope=~"general"}[$__rate_interval])) by (txn_mode)/ sum(rate(tidb_session_transaction_duration_seconds_count{scope=~"general"}[$__rate_interval])) by (txn_mode)',
              name: 'avg-{txn_mode}',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tidb_session_transaction_duration_seconds_bucket[$__rate_interval])) by (le, txn_mode))',
              name: '99-{txn_mode}',
              type: 'line'
            }
          ],
          unit: 's'
        }
      ]
    },
    {
      category: 'core_path_duration',
      metrics: [
        {
          title: 'Avg TiDB KV Request Duration',
          queries: [
            {
              promql:
                'sum(rate(tidb_tikvclient_request_seconds_sum{store!="0"}[$__rate_interval])) by (type)/ sum(rate(tidb_tikvclient_request_seconds_count{store!="0"}[$__rate_interval])) by (type)',
              name: '{type}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'Avg TiKV GRPC Duration',
          queries: [
            {
              promql:
                'sum(rate(tikv_grpc_msg_duration_seconds_sum{store!="0"}[$__rate_interval])) by (type)/ sum(rate(tikv_grpc_msg_duration_seconds_count{store!="0"}[$__rate_interval])) by (type)',
              name: '{type}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'Average / P99 PD TSO Wait/RPC Duration',
          queries: [
            {
              promql:
                '(sum(rate(pd_client_cmd_handle_cmds_duration_seconds_sum{type="wait"}[$__rate_interval])) / sum(rate(pd_client_cmd_handle_cmds_duration_seconds_count{type="wait"}[$__rate_interval])))',
              name: 'wait - avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(pd_client_cmd_handle_cmds_duration_seconds_bucket{type="wait"}[$__rate_interval])) by (le))',
              name: 'wait - 99',
              type: 'line'
            },
            {
              promql:
                '(sum(rate(pd_client_request_handle_requests_duration_seconds_sum{type="tso"}[$__rate_interval])) / sum(rate(pd_client_request_handle_requests_duration_seconds_count{type="tso"}[$__rate_interval])))',
              name: 'rpc - avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(pd_client_request_handle_requests_duration_seconds_bucket{type="tso"}[$__rate_interval])) by (le))',
              name: 'rpc - 99',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'Average / P99 Storage Async Write Duration',
          queries: [
            {
              promql:
                'sum(rate(tikv_storage_engine_async_request_duration_seconds_sum{type="write"}[$__rate_interval])) / sum(rate(tikv_storage_engine_async_request_duration_seconds_count{type="write"}[$__rate_interval]))',
              name: 'avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tikv_storage_engine_async_request_duration_seconds_bucket{type="write"}[$__rate_interval])) by (le))',
              name: '99',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'Average / P99 Store Duration',
          queries: [
            {
              promql:
                'sum(rate(tikv_raftstore_store_duration_secs_sum[$__rate_interval])) / sum(rate(tikv_raftstore_store_duration_secs_count[$__rate_interval]))',
              name: 'avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tikv_raftstore_store_duration_secs_bucket[$__rate_interval])) by (le))',
              name: '99',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'Average / P99 Apply Duration',
          queries: [
            {
              promql:
                '(sum(rate(tikv_raftstore_apply_duration_secs_sum[$__rate_interval])) / sum(rate(tikv_raftstore_apply_duration_secs_count[$__rate_interval])))',
              name: 'avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tikv_raftstore_apply_duration_secs_bucket[$__rate_interval])) by (le))',
              name: '99',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'Average / P99 Append Log Duration',
          queries: [
            {
              promql:
                '(sum(rate(tikv_raftstore_append_log_duration_seconds_sum[$__rate_interval])) / sum(rate(tikv_raftstore_append_log_duration_seconds_count[$__rate_interval])))',
              name: 'avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tikv_raftstore_append_log_duration_seconds_bucket[$__rate_interval])) by (le))',
              name: '99',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'Average / P99 Commit Log Duration',
          queries: [
            {
              promql:
                '(sum(rate(tikv_raftstore_commit_log_duration_seconds_sum[$__rate_interval])) / sum(rate(tikv_raftstore_commit_log_duration_seconds_count[$__rate_interval])))',
              name: 'avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tikv_raftstore_commit_log_duration_seconds_bucket[$__rate_interval])) by (le))',
              name: '99',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'Average / P99 Apply Log Duration',
          queries: [
            {
              promql:
                '(sum(rate(tikv_raftstore_apply_log_duration_seconds_sum[$__rate_interval])) / sum(rate(tikv_raftstore_apply_log_duration_seconds_count[$__rate_interval])))',
              name: 'avg',
              type: 'line'
            },
            {
              promql:
                'histogram_quantile(0.99, sum(rate(tikv_raftstore_apply_log_duration_seconds_bucket[$__rate_interval])) by (le))',
              name: '99',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        }
      ]
    },
    {
      category: 'server',
      metrics: [
        {
          title: 'TiDB Uptime',
          queries: [
            {
              promql: '(time() - process_start_time_seconds{component="tidb"})',
              name: '{instance}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'TiDB CPU Usage',
          queries: [
            {
              promql:
                'irate(process_cpu_seconds_total{component="tidb"}[$__rate_interval])',
              name: '{instance}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 'percentunit'
        },
        {
          title: 'TiDB Memory Usage',
          queries: [
            {
              promql: 'process_resident_memory_bytes{component="tidb"}',
              name: '{instance}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 'bytes'
        },
        {
          title: 'TiKV Uptime',
          queries: [
            {
              promql: '(time() - process_start_time_seconds{component="tikv"})',
              name: '{instance}',
              type: 'line'
            }
          ],
          unit: 's'
        },
        {
          title: 'TiKV CPU Usage',
          queries: [
            {
              promql:
                'sum(rate(tikv_thread_cpu_seconds_total[$__rate_interval])) by (instance)',
              name: '{instance}',
              type: 'line'
            }
          ],
          unit: 'percentunit'
        },
        {
          title: 'TiKV Memory Usage',
          queries: [
            {
              promql:
                'avg(process_resident_memory_bytes{component="tikv"}) by (instance)',
              name: '{instance}',
              type: 'line'
            }
          ],
          unit: 'bytes'
        },
        {
          title: 'TiKV IO MBps',
          queries: [
            {
              promql:
                'sum(rate(tikv_engine_flow_bytes{db="kv", type="wal_file_bytes"}[$__rate_interval])) by (instance) + (sum(rate(tikv_engine_flow_bytes{db="raft", type="wal_file_bytes"}[$__rate_interval])) by (instance) or (0 * sum(rate(raft_engine_write_size_sum[$__rate_interval])) by (instance))) + (sum(rate(raft_engine_write_size_sum[$__rate_interval])) by (instance) or (0 * sum(rate(tikv_engine_flow_bytes{db="raft", type="wal_file_bytes"}[$__rate_interval])) by (instance)))',
              name: '{instance}-write',
              type: 'line'
            },
            {
              promql:
                'sum(rate(tikv_engine_flow_bytes{db="kv", type=~"bytes_read|iter_bytes_read"}[$__rate_interval])) by (instance)',
              name: '{instance}-read',
              type: 'line'
            }
          ],
          unit: 'Bps'
        },
        {
          title: 'TiKV Storage Usage',
          queries: [
            {
              promql: loadTiKVStoragePromql(),
              name: '{instance}',
              type: 'area_stack'
            }
          ],
          unit: 'bytes'
        },
        {
          title: 'TiFlash Uptime',
          queries: [
            {
              promql: 'tiflash_system_asynchronous_metric_Uptime',
              name: '{instance}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 's'
        },
        {
          title: 'TiFlash CPU Usage',
          queries: [
            {
              promql:
                'rate(tiflash_proxy_process_cpu_seconds_total{component="tiflash"}[$__rate_interval])',
              name: '{instance}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 'percentunit'
        },
        {
          title: 'TiFlash Memory',
          queries: [
            {
              promql:
                'tiflash_proxy_process_resident_memory_bytes{component="tiflash"}',
              name: '{instance}',
              type: 'line'
            }
          ],
          nullValue: TransformNullValue.AS_ZERO,
          unit: 'bytes'
        },
        {
          title: 'TiFlash IO MBps',
          queries: [
            {
              promql:
                'sum(rate(tiflash_system_profile_event_WriteBufferFromFileDescriptorWriteBytes[$__rate_interval])) by (instance) + sum(rate(tiflash_system_profile_event_PSMWriteBytes[$__rate_interval])) by (instance) + sum(rate(tiflash_system_profile_event_WriteBufferAIOWriteBytes[$__rate_interval])) by (instance)',
              name: '{instance}-write',
              type: 'line'
            },
            {
              promql:
                'sum(rate(tiflash_system_profile_event_ReadBufferFromFileDescriptorReadBytes[$__rate_interval])) by (instance) + sum(rate(tiflash_system_profile_event_PSMReadBytes[$__rate_interval])) by (instance) + sum(rate(tiflash_system_profile_event_ReadBufferAIOReadBytes[$__rate_interval])) by (instance)',
              name: '{instance}-read',
              type: 'line'
            }
          ],
          unit: 'Bps'
        },
        {
          title: 'TiFlash Storage Usage',
          queries: [
            {
              promql:
                'sum(tiflash_system_current_metric_StoreSizeUsed) by (instance)',
              name: '{instance}',
              type: 'area_stack'
            }
          ],
          unit: 'bytes'
        }
      ]
    }
  ]

  return monitoringItems
}

export { getMonitoringItems }
