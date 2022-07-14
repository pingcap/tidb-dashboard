const MetricsItems = [
  {
    category: 'Application Connection',
    metrics: [
      {
        title: 'connection_count',
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
        title: 'disconnection',
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
        title: 'connection_idle_duration',
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
    category: 'Database Time',
    metrics: [
      {
        title: 'database_time',
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
        title: 'database_time_by_sql_type',
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
        title: 'database_time_by_steps_of_sql_processig',
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
    category: 'SQL Count',
    metrics: [
      {
        title: 'sql_count_qps',
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
        title: 'failed_queries',
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
        title: 'cps',
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
    category: 'Core Feature Usage',
    metrics: [
      {
        title: 'ops',
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
    category: 'Latency break down',
    metrics: [
      {
        title: 'query',
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
        title: 'get_token',
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
        title: 'parse',
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
        title: 'compile',
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
        title: 'execution',
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
    category: 'Transaction',
    metrics: [
      {
        title: 'tps',
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
        id: 'average_duration',
        title: 'transaction_average_duration',
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
    category: 'Server',
    metrics: [
      {
        title: 'tidb_uptime',
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
        title: 'tidb_cpu_usage',
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
        title: 'tidb_memory_usage',
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
        title: 'tikv_uptime',
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
        title: 'tikv_cpu_usage',
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
        title: 'tikv_memory_usage',
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
        title: 'tikv_io_mbps',
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
        title: 'tikv_storage_usage',
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

export { MetricsItems }
