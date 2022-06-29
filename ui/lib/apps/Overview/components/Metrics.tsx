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

import { PointerEvent, Chart } from '@elastic/charts'

import { ChartContext } from '../../../components/MetricChart/ChartContext'

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
            query: `(sum(rate(tidb_server_conn_idle_duration_seconds_sum[$__rate_interval])))`,
            name: 'avg-in-txn',
          },
          {
            query: `(sum(rate(tidb_server_conn_idle_duration_seconds_sum[$__rate_interval])) / sum(rate(tidb_server_conn_idle_duration_seconds_count[$__rate_interval])))`,
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
              'sum(rate(tidb_server_query_total[$__rate_interval])) by (type)',
            name: '{type}',
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
            name: 'average',
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
              'sum(rate(tidb_server_handle_query_duration_seconds_sum[$__rate_interval]))',
            name: 'avg',
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket[$__rate_interval])) by (le))',
            name: '99%',
          },
          {
            query:
              'sum(rate(tidb_server_handle_query_duration_seconds_sum}[$__rate_interval])) by (sql_type) / sum(rate(tidb_server_handle_query_duration_seconds_count[$__rate_interval])) by (sql_type)',
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

function CPU(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>{t('overview.metrics.cpu')}</Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'avg(rate(process_cpu_seconds_total{k8s_cluster="$k8s_cluster",tidb_cluster="$tidb_cluster",job="tidb"}[1m]))',
            name: 'avg',
          },
        ]}
        yDomain={{ min: 0, max: 100 }}
        unit="percent"
        type="line"
        {...props}
      />
    </Card>
  )
}

// TiDB Memory Usage
function TiDBCPUUsage(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.memory')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: 'irate(process_cpu_seconds_total[$__rate_interval])',
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
        {t('overview.metrics.memory')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: 'process_resident_memory_bytes',
            name: 'process-{instance}',
          },
          {
            query: `go_memory_classes_heap_objects_bytes + go_memory_classes_heap_unused_bytes`,
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

function IO(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>{t('overview.metrics.io')}</Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'irate(node_disk_io_time_seconds_total[$__rate_interval]) * 100',
            name: '{instance} - {device}',
          },
        ]}
        yDomain={{ min: 0, max: 100 }}
        unit="percent"
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

      <ChartContext.Provider value={[pointerEvent, setPointerEvent]}>
        <Stack tokens={{ childrenGap: 16 }}>
          {/* <Connection {...metricProps('connection')} />
          <Disconnection {...metricProps('disconneciton')} />
          <ConnectionIdleDuration
            {...metricProps('connection_idle_duration')}
          />
          <DatabaseTime {...metricProps('database_time')}/>
          <DatabaseTimeByPhrase {...metricProps('database_time_by_phrase')}/>
          <DatabaseExecTime {...metricProps('database_exec_time')}/>
          <QPS {...metricProps('qps')} />
          <FailedQuery {...metricProps('failed_query')} />
          <CPS {...metricProps('cps')} />
          <OPS {...metricProps('ops')} /> */}
          <Latency {...metricProps('latency')} />
          {/* <CPU {...metricProps('cpu')} /> */}
          {/* <TiDBCPUUsage {...metricProps('tidb_cpu_usage')} /> */}

          {/* <TiDBMemoryUsage {...metricProps('memory')} /> */}

          {/* <IO {...metricProps('io')} /> */}
        </Stack>
      </ChartContext.Provider>
    </>
  )
}
