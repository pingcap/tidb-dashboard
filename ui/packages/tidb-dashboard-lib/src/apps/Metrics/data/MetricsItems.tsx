const metricsItems = [
  {
    category: 'application_connection',
    metrics: [
      {
        title: 'Connection Count',
        queries: [
          {
            query: 'sum(tidb_server_connections)',
            name: 'total'
          },
          {
            query: 'sum(tidb_server_tokens)',
            name: 'active connections'
          }
        ],
        unit: null,
        type: 'line'
      },
      {
        title: 'Disconnection',
        queries: [
          {
            query: 'sum(tidb_server_disconnection_total) by (instance, result)',
            name: '{instance}-{result}'
          }
        ],
        unit: null,
        type: 'line'
      },
      {
        title: 'Average Idle Connection Duration',
        queries: [
          {
            query: `(sum(rate(tidb_server_conn_idle_duration_seconds_sum{in_txn='1'}[$__rate_interval])) / sum(rate(tidb_server_conn_idle_duration_seconds_count{in_txn='1'}[$__rate_interval])))`,
            name: 'avg-in-txn'
          },
          {
            query: `(sum(rate(tidb_server_conn_idle_duration_seconds_sum{in_txn='0'}[$__rate_interval])) / sum(rate(tidb_server_conn_idle_duration_seconds_count{in_txn='0'}[$__rate_interval])))`,
            name: 'avg-not-in-txn'
          }
        ],
        unit: 's',
        type: 'line'
      }
    ]
  },
  {
    category: 'database_time',
    metrics: [
      {
        title: 'Database Time',
        queries: [
          {
            query: `sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval]))`,
            name: 'database time'
          }
        ],
        unit: 's',
        type: 'line'
      },
      {
        title: 'Database Time by SQL Types',
        queries: [
          {
            query: `sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval])) by (sql_type)`,
            name: '{sql_type}'
          }
        ],
        unit: 's',
        type: 'line'
      },
      {
        title: 'Database Time by Steps of SQL Processing',
        queries: [
          {
            query: `sum(rate(tidb_session_parse_duration_seconds_sum{sql_type="general"}[$__rate_interval]))`,
            name: 'parse'
          },
          {
            query: `sum(rate(tidb_session_compile_duration_seconds_sum{sql_type="general"}[$__rate_interval]))`,
            name: 'compile'
          },
          {
            query: `sum(rate(tidb_session_execute_duration_seconds_sum{sql_type="general"}[$__rate_interval]))`,
            name: 'execute'
          },
          {
            query: `sum(rate(tidb_server_get_token_duration_seconds_sum{sql_type="general"}[$__rate_interval]))/1000000`,
            name: 'get token'
          }
        ],
        unit: 's',
        type: 'line'
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
            query: 'sum(rate(tidb_executor_statement_total[$__rate_interval]))',
            name: 'total'
          },
          {
            query:
              'sum(rate(tidb_executor_statement_total[$__rate_interval])) by (type)',
            name: '{type}'
          }
        ],
        unit: 'qps',
        type: 'line'
      },
      {
        title: 'Failed Queries',
        queries: [
          {
            query:
              'increase(tidb_server_execute_error_total[$__rate_interval])',
            name: '{type} @ {instance}'
          }
        ],
        unit: null,
        type: 'line'
      },
      {
        title: 'Command Per Second',
        queries: [
          {
            query:
              'sum(rate(tidb_server_query_total[$__rate_interval])) by (result)',
            name: 'query {type}'
          }
        ],
        unit: null,
        type: 'line'
      }
    ]
  },
  {
    category: 'core_feature_usage',
    metrics: [
      {
        title: 'Queries Using Plan Cache OPS',
        queries: [
          {
            query:
              'sum(rate(tidb_server_plan_cache_total[$__rate_interval])) by (type)',
            name: 'avg'
          }
        ],
        unit: null,
        type: 'line'
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
            query:
              'sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval])) / sum(rate(tidb_server_handle_query_duration_seconds_count{sql_type!="internal"}[$__rate_interval]))',
            name: 'avg'
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket{sql_type!="internal"}[$__rate_interval])) by (le))',
            name: '99'
          },
          {
            query:
              'sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval])) by (sql_type) / sum(rate(tidb_server_handle_query_duration_seconds_count{sql_type!="internal"}[$__rate_interval])) by (sql_type)',
            name: 'avg-{sql_type}'
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket{sql_type!="internal"}[$__rate_interval])) by (le,sql_type))',
            name: '99-{{sql_type}}'
          }
        ],
        unit: 's',
        type: 'line'
      },
      {
        title: 'Get Token Duration',
        queries: [
          {
            query:
              'sum(rate(tidb_server_get_token_duration_seconds_sum{sql_type="general"}[$__rate_interval])) / sum(rate(tidb_server_get_token_duration_seconds_count{sql_type="general"}[$__rate_interval]))',
            name: 'avg'
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_server_get_token_duration_seconds_bucket[$__rate_interval])) by (le))',
            name: '99'
          }
        ],
        unit: 's',
        type: 'line'
      },
      {
        title: 'Parse Duration',
        queries: [
          {
            query:
              '(sum(rate(tidb_session_parse_duration_seconds_sum{sql_type="general"}[$__rate_interval])) / sum(rate(tidb_session_parse_duration_seconds_count{sql_type="general"}[$__rate_interval])))',
            name: 'avg'
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_session_parse_duration_seconds_bucket{sql_type="general"}[$__rate_interval])) by (le))',
            name: '99%'
          }
        ],
        unit: 's',
        type: 'line'
      },
      {
        title: 'Compile Duration',
        queries: [
          {
            query:
              '(sum(rate(tidb_session_compile_duration_seconds_sum{sql_type="general"}[$__rate_interval])) / sum(rate(tidb_session_compile_duration_seconds_count{sql_type="general"}[$__rate_interval])))',
            name: 'avg'
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_session_compile_duration_seconds_bucket{sql_type="general"}[$__rate_interval])) by (le))',
            name: '99%'
          }
        ],
        unit: 's',
        type: 'line'
      },
      {
        title: 'Execution Duraion',
        queries: [
          {
            query:
              '(sum(rate(tidb_session_execute_duration_seconds_sum{sql_type="general"}[$__rate_interval])) / sum(rate(tidb_session_execute_duration_seconds_count{sql_type="general"}[$__rate_interval])))',
            name: 'avg'
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_session_execute_duration_seconds_bucket{sql_type="general"}[$__rate_interval])) by (le))',
            name: '99%'
          }
        ],
        unit: 's',
        type: 'line'
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
            query:
              'sum(rate(tidb_session_transaction_duration_seconds_count[$__rate_interval])) by (type, txn_mode)',
            name: '{type}-{txn_mode}'
          }
        ],
        unit: 's',
        type: 'line'
      },
      {
        title: 'Transaction Duration',
        queries: [
          {
            query:
              'sum(rate(tidb_session_transaction_duration_seconds_sum[$__rate_interval])) by (txn_mode)/ sum(rate(tidb_session_transaction_duration_seconds_count[$__rate_interval])) by (txn_mode)',
            name: 'avg'
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_session_transaction_duration_seconds_bucket[$__rate_interval])) by (le, txn_mode))',
            name: '99-{txn_mode}'
          }
        ],
        unit: 's',
        type: 'line'
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
            query: '(time() - process_start_time_seconds{job="tidb"})',
            name: '{instance}'
          }
        ],
        unit: 's',
        type: 'line'
      },
      {
        title: 'TiDB CPU Usage',
        queries: [
          {
            query:
              'rate(process_cpu_seconds_total{job="tidb"}[$__rate_interval])',
            name: '{instance}'
          }
        ],
        unit: 'percent',
        type: 'line'
      },
      {
        title: 'TiDB Memory Usage',
        queries: [
          {
            query: 'process_resident_memory_bytes{job="tidb"}',
            name: '{instance}'
          }
        ],
        unit: 'decbytes',
        type: 'line'
      },
      {
        title: 'TiKV Uptime',
        queries: [
          {
            query: '(time() - process_start_time_seconds{job="tikv"})',
            name: '{instance}'
          }
        ],
        unit: 's',
        type: 'line'
      },
      {
        title: 'TiKV CPU Usage',
        queries: [
          {
            query:
              'sum(rate(tikv_thread_cpu_seconds_total[$__rate_interval])) by (instance)',
            name: '{instance}'
          }
        ],
        unit: 'percent',
        type: 'line'
      },
      {
        title: 'TiKV Memory Usage',
        queries: [
          {
            query: 'process_resident_memory_bytes{job=~".*tikv"}',
            name: '{instance}'
          }
        ],
        unit: 'decbytes',
        type: 'line'
      },
      {
        title: 'TiKV IO MBps',
        queries: [
          {
            query:
              'sum(rate(tikv_engine_flow_bytes{db="raft", type="wal_file_bytes"}[$__rate_interval])) by (instance) + sum(rate(raft_engine_write_size_sum[$__rate_interval])) by (instance)',
            name: '{instance}-write'
          },
          {
            query:
              'sum(rate(tikv_engine_flow_bytes{db="kv", type=~"bytes_read|iter_bytes_read"}[$__rate_interval])) by (instance)',
            name: '{instance}-read'
          }
        ],
        unit: 'decbytes',
        type: 'line'
      },
      {
        title: 'TiKV Storage Usage',
        queries: [
          {
            query: 'sum(tikv_store_size_bytes{type="used"}) by (instance)',
            name: '{instance}'
          }
        ],
        unit: 'decbytes',
        type: 'line'
      }
    ]
  }
]

export { metricsItems }
