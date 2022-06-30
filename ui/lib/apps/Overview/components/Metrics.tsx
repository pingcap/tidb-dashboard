import { Space, Typography } from 'antd'
import React, { useMemo, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AutoRefreshButton,
  Card,
  DEFAULT_TIME_RANGE,
  MetricChart,
  TimeRange,
  TimeRangeSelector,
  Toolbar,
} from '@lib/components'
import { Range } from '@elastic/charts/dist/utils/domain'
import { Stack } from 'office-ui-fabric-react'
import { useTimeRangeValue } from '@lib/components/TimeRangeSelector/hook'
import { LoadingOutlined } from '@ant-design/icons'
import { min, some } from 'lodash'

import { PointerEvent } from '@elastic/charts'

import { ChartContext } from '../../../components/MetricChart/ChartContext'
import { useEventEmitter } from 'ahooks'

interface IChartProps {
  range: Range
  onRangeChange?: (newRange: Range) => void
  onLoadingStateChange?: (isLoading: boolean) => void
}

function Connection(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t(`overview.metrics.connection.total`)}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: 'tidb_server_connections',
            name: '{instance}',
          },
          {
            query: 'sum(tidb_server_connections)',
            name: 'total',
          },
          {
            query:
              'sum(rate(tidb_server_handle_query_duration_seconds_sum[$__rate_interval]))',
            name: 'active connections',
          },
        ]}
        type="line"
        {...props}
      />
    </Card>
  )
}

function Disconnection(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t(`overview.metrics.connection.disconnection`)}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: 'sum(tidb_server_disconnection_total) by (instance, result)',
            name: '{instance}-{result}',
          },
        ]}
        type="line"
        {...props}
      />
    </Card>
  )
}

function ConnectionIdleDuration(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.connection.idle')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: `(sum(rate(tidb_server_conn_idle_duration_seconds_sum{in_txn='1'}[$__rate_interval])) / sum(rate(tidb_server_conn_idle_duration_seconds_countin_txn='1'}[$__rate_interval])))`,
            name: 'avg-in-txn',
          },
          {
            query: `(sum(rate(tidb_server_conn_idle_duration_seconds_sum{in_txn='0'}[$__rate_interval])) / sum(rate(tidb_server_conn_idle_duration_seconds_count{in_txn='0'}[$__rate_interval])))`,
            name: 'avg-not-in-txn',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

function DatabaseTime(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.database_time.by_sql_type')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: `sum(rate(tidb_server_handle_query_duration_seconds_sum[$__rate_interval]))`,
            name: 'database time',
          },
          {
            query: `sum(rate(tidb_server_handle_query_duration_seconds_sum[$__rate_interval])) by (sql_type)`,
            name: '{sql_type}',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

function DatabaseTimeByPhrase(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.database_time.by_steps_of_sql_processig')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: `sum(rate(tidb_session_parse_duration_seconds_sum[$__rate_interval]))`,
            name: 'parse',
          },
          {
            query: `sum(rate(tidb_session_compile_duration_seconds_sum[$__rate_interval]))`,
            name: 'compile',
          },
          {
            query: `sum(rate(tidb_session_execute_duration_seconds_sum[$__rate_interval]))`,
            name: 'execute',
          },
          {
            query: `sum(rate(tidb_server_get_token_duration_seconds_sum[$__rate_interval]))`,
            name: 'get token',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

function DatabaseExecTime(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.database_time.execute_time')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: `sum(rate(tidb_tikvclient_request_seconds_sum[$__rate_interval])) by (type)`,
            name: '{type}',
          },
          {
            query: `sum(rate(pd_client_cmd_handle_cmds_duration_seconds_sum[$__rate_interval]))`,
            name: 'tso_wait',
          },
          {
            query: `sum(rate(tidb_session_execute_duration_seconds_sum[$__rate_interval]))`,
            name: 'execute time',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

function QPS(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.sql_count.qps')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: 'sum(rate(tidb_executor_statement_total[$__rate_interval]))',
            name: 'total',
          },
          {
            query:
              'sum(rate(tidb_executor_statement_total[$__rate_interval])) by (type)',
            name: '{type}',
          },
        ]}
        unit="qps"
        type="line"
        {...props}
      />
    </Card>
  )
}

function FailedQuery(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.sql_count.failed_queries')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'increase(tidb_server_execute_error_total[$__rate_interval])',
            name: '{type} @ {instance}',
          },
        ]}
        type="line"
        {...props}
      />
    </Card>
  )
}

function CPS(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.sql_count.cps')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(rate(tidb_server_query_total[$__rate_interval])) by (result)',
            name: 'query {type}',
          },
        ]}
        type="line"
        {...props}
      />
    </Card>
  )
}

function OPS(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.core_feature_usag.ops')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(rate(tidb_server_plan_cache_total[$__rate_interval])) by (type)',
            name: 'avg',
          },
        ]}
        type="line"
        {...props}
      />
    </Card>
  )
}

function Latency(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.latency.query')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval])) / sum(rate(tidb_server_handle_query_duration_seconds_count{sql_type!="internal"}[$__rate_interval]))',
            name: 'avg',
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket{sql_type!="internal"}[$__rate_interval])) by (le))',
            name: '99',
          },
          {
            query:
              'sum(rate(tidb_server_handle_query_duration_seconds_sum{ sql_type!="internal"}[$__rate_interval])) by (sql_type) / sum(rate(tidb_server_handle_query_duration_seconds_count{sql_type!="internal"}[$__rate_interval])) by (sql_type)',
            name: 'avg-{sql_type}',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

function GetTokenDuration(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.latency.get_token')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(rate(tidb_server_get_token_duration_seconds_bucket[$__rate_interval]))',
            name: 'avg',
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_server_get_token_duration_seconds_bucket[$__rate_interval])) by (le))',
            name: '99',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

function ParseDuration(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.latency.parse')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              '(sum(rate(tidb_session_parse_duration_seconds_sum{sql_type="general"}[$__rate_interval])) / sum(rate(tidb_session_parse_duration_seconds_count{sql_type="general"}[$__rate_interval])))',
            name: 'avg',
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_session_parse_duration_seconds_bucket{sql_type="general"}[$__rate_interval])) by (le))',
            name: '99%',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

function CompileDuration(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.latency.compile')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              '(sum(rate(tidb_session_compile_duration_seconds_sum{sql_type="general"}[$__rate_interval])) / sum(rate(tidb_session_compile_duration_seconds_count{sql_type="general"}[$__rate_interval])))',
            name: 'avg',
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_session_compile_duration_seconds_bucket{sql_type="general"}[$__rate_interval])) by (le))',
            name: '99%',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

function ExecDuration(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.latency.execution')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              '(sum(rate(tidb_session_execute_duration_seconds_sum{sql_type="general"}[$__rate_interval])) / sum(rate(tidb_session_execute_duration_seconds_count{sql_type="general"}[$__rate_interval])))',
            name: 'avg',
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_session_execute_duration_seconds_bucket{sql_type="general"}[$__rate_interval])) by (le))',
            name: '99%',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

function Transaction(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.transaction.tps')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(rate(tidb_session_transaction_duration_seconds_count[$__rate_interval])) by (type, txn_mode)',
            name: '{type}-{txn_mode}',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

function TransactionDuration(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.transaction.average_duration')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              '(sum(rate(tidb_session_transaction_duration_seconds_sum[$__rate_interval])) / sum(rate(tidb_session_transaction_duration_seconds_count[$__rate_interval])))',
            name: 'avg',
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_session_transaction_duration_seconds_bucket[$__rate_interval])) by (le, txn_mode))',
            name: '99-{txn_mode}',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

function TransactionRetry(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.transaction.retry_count')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(increase(tidb_session_retry_num_bucket[$__rate_interval])) by (le)',
            name: '{le}',
          },
        ]}
        type="line"
        {...props}
      />
    </Card>
  )
}

function TiDBUptime(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.server.tidb_uptime')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: '(time() - process_start_time_seconds{job="tidb"})',
            name: '{instance}',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

// TiDB CPU Usage
function TiDBCPUUsage(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.server.tidb_cpu_usage')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'irate(process_cpu_seconds_total{job="tidb"}[$__rate_interval])',
            name: '{instance}',
          },
        ]}
        unit="percent"
        type="line"
        {...props}
      />
    </Card>
  )
}

// TiDB Memory Usage
function TiDBMemoryUsage(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.server.tidb_memory_usage')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: `tidb_server_memory_usage{job="tidb"}`,
            name: '{type}-{instance}',
          },
          {
            query: 'process_resident_memory_bytes{job="tidb"}',
            name: 'process-{instance}',
          },
          {
            query: `go_memory_classes_heap_objects_bytes{job="tidb"} + go_memory_classes_heap_unused_bytes{job="tidb"}`,
            name: 'HeapInuse-{instance}',
          },
        ]}
        unit="decbytes"
        type="line"
        {...props}
      />
    </Card>
  )
}

function TiKVUptime(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.server.tikv_uptime')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(rate(process_cpu_seconds_total{job=~".*tikv"}[$__rate_interval])) by (instance)',
            name: '{instance}',
          },
        ]}
        unit="s"
        type="line"
        {...props}
      />
    </Card>
  )
}

// TiKV CPU Usage
function TiKVCPUUsage(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.server.tikv_cpu_usage')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(rate(process_cpu_seconds_total{job=~".*tikv"}[$__rate_interval])) by (instance)',
            name: '{instance}',
          },
        ]}
        unit="percent"
        type="line"
        {...props}
      />
    </Card>
  )
}

// TiKV Memory Usage
function TiKVMemoryUsage(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.server.tikv_memory_usage')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'avg(process_resident_memory_bytes{job=~".*tikv"}) by (instance)',
            name: '{instance}',
          },
        ]}
        unit="decbytes"
        type="line"
        {...props}
      />
    </Card>
  )
}

function TiKVIO(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.server.tikv_io_mbps')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(rate(tikv_engine_flow_bytes{db="kv", type="wal_file_bytes"}[$__rate_interval])) by (instance)',
            name: '{instance}-write',
          },
          {
            query:
              'sum(rate(tikv_engine_flow_bytes{db="kv", type=~"bytes_read|iter_bytes_read"}[$__rate_interval])) by (instance)',
            name: '{instance}-read',
          },
        ]}
        unit="decbytes"
        type="line"
        {...props}
      />
    </Card>
  )
}

// TODO: check size unit
function TiKVStorageUsage(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.server.tikv_storage_usage')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: 'sum(tikv_store_size_bytes{type="used"}) by (instance)',
            name: '{instance}',
          },
        ]}
        unit="decbytes"
        type="line"
        {...props}
      />
    </Card>
  )
}

export default function Metrics() {
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE)
  const [chartRange, setChartRange] = useTimeRangeValue(timeRange, setTimeRange)
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [pointerEvent, setPointerEvent] = useState<PointerEvent>()

  const isSomeLoading = useMemo(() => {
    return some(Object.values(isLoading))
  }, [isLoading])

  function metricProps(id: string): IChartProps {
    return {
      range: chartRange,
      onRangeChange: setChartRange,
      onLoadingStateChange: (loading) =>
        setIsLoading((v) => ({ ...v, [id]: loading })),
    }
  }

  return (
    <>
      <Card>
        <Toolbar>
          <Space>
            <TimeRangeSelector.WithZoomOut
              value={timeRange}
              onChange={setTimeRange}
            />
            <AutoRefreshButton
              onRefresh={() => setTimeRange((r) => ({ ...r }))}
              disabled={isSomeLoading}
            />
            {isSomeLoading && <LoadingOutlined />}
          </Space>
        </Toolbar>
      </Card>

      <ChartContext.Provider value={useEventEmitter<PointerEvent>()}>
        <Stack tokens={{ childrenGap: 16 }}>
          <Connection {...metricProps('connection')} />
          <Disconnection {...metricProps('disconneciton')} />
          <ConnectionIdleDuration
            {...metricProps('connection_idle_duration')}
          />
          <DatabaseTime {...metricProps('database_time')} />
          <DatabaseTimeByPhrase {...metricProps('database_time_by_phrase')} />
          <DatabaseExecTime {...metricProps('database_exec_time')} />
          <QPS {...metricProps('qps')} />
          <FailedQuery {...metricProps('failed_query')} />
          <CPS {...metricProps('cps')} />
          <OPS {...metricProps('ops')} />
          <Latency {...metricProps('latency')} />
          <GetTokenDuration {...metricProps('get_token')} />
          <ParseDuration {...metricProps('parse')} />
          <CompileDuration {...metricProps('compile')} />
          <ExecDuration {...metricProps('execution')} />
          <Transaction {...metricProps('tps')} />
          <TransactionDuration {...metricProps('average_duration')} />
          <TransactionRetry {...metricProps('retry_count')} />
          <TiDBUptime {...metricProps('tidb_uptime')} />
          <TiDBCPUUsage {...metricProps('tidb_cpu_usage')} />
          <TiDBMemoryUsage {...metricProps('tidb_memory_usage')} />
          <TiKVUptime {...metricProps('tikv_uptime')} />
          <TiKVCPUUsage {...metricProps('tikv_cpu_usage')} />
          <TiKVMemoryUsage {...metricProps('tikv_memory_usage')} />
          <TiKVIO {...metricProps('tikv_io_mbps')} />
          <TiKVStorageUsage {...metricProps('tikv_storage_usage')} />
        </Stack>
      </ChartContext.Provider>
    </>
  )
}
