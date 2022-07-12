import { Space, Typography, Row, Col, Collapse, Button } from 'antd'
import React, { useMemo, useState } from 'react'
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
import { Link } from 'react-router-dom'
import { Range } from '@elastic/charts/dist/utils/domain'
import { Stack } from 'office-ui-fabric-react'
import { useTimeRangeValue } from '@lib/components/TimeRangeSelector/hook'
import { LoadingOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { some } from 'lodash'

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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {t(`overview.metrics.connection.total`)}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: 'sum(tidb_server_connections)',
            name: 'total',
          },
          {
            query: 'sum(tidb_server_tokens)',
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {t('overview.metrics.database_time.by_sql_type')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: `sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval]))`,
            name: 'database time',
          },
          {
            query: `sum(rate(tidb_server_handle_query_duration_seconds_sum{sql_type!="internal"}[$__rate_interval])) by (sql_type)`,
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {t('overview.metrics.database_time.by_steps_of_sql_processig')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: `sum(rate(tidb_session_parse_duration_seconds_sum{sql_type="general"}[$__rate_interval]))`,
            name: 'parse',
          },
          {
            query: `sum(rate(tidb_session_compile_duration_seconds_sum{sql_type="general"}[$__rate_interval]))`,
            name: 'compile',
          },
          {
            query: `sum(rate(tidb_session_execute_duration_seconds_sum{sql_type="general"}[$__rate_interval]))`,
            name: 'execute',
          },
          {
            query: `sum(rate(tidb_server_get_token_duration_seconds_sum{sql_type="general"}[$__rate_interval]))/1000000`,
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

function QPS(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket{sql_type!="internal"}[$__rate_interval])) by (le,sql_type))',
            name: '99-{{sql_type}}',
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {t('overview.metrics.latency.get_token')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(rate(tidb_server_get_token_duration_seconds_sum{sql_type="general"}[$__rate_interval])) / sum(rate(tidb_server_get_token_duration_seconds_count{sql_type="general"}[$__rate_interval]))',
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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
    <Card noMarginTop>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {t('overview.metrics.transaction.average_duration')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(rate(tidb_session_transaction_duration_seconds_sum[$__rate_interval])) by (txn_mode)/ sum(rate(tidb_session_transaction_duration_seconds_count[$__rate_interval])) by (txn_mode)',
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

function TiDBUptime(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {t('overview.metrics.server.tidb_cpu_usage')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'rate(process_cpu_seconds_total{job="tidb"}[$__rate_interval])',
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {t('overview.metrics.server.tidb_memory_usage')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: 'process_resident_memory_bytes{job="tidb"}',
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

function TiKVUptime(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {t('overview.metrics.server.tikv_uptime')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: '(time() - process_start_time_seconds{job="tikv"})',
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {t('overview.metrics.server.tikv_cpu_usage')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(rate(tikv_thread_cpu_seconds_total[$__rate_interval])) by (instance)',
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {t('overview.metrics.server.tikv_memory_usage')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query: 'process_resident_memory_bytes{job=~".*tikv"}',
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {t('overview.metrics.server.tikv_io_mbps')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'sum(rate(tikv_engine_flow_bytes{db="raft", type="wal_file_bytes"}[$__rate_interval])) by (instance) + sum(rate(raft_engine_write_size_sum[$__rate_interval])) by (instance)',
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
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
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

export default function Metrics(props) {
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE)
  const [chartRange, setChartRange] = useTimeRangeValue(timeRange, setTimeRange)
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [pointerEvent, setPointerEvent] = useState<PointerEvent>()
  const { allTypes: showAllPerformanceMetics } = props
  const { t } = useTranslation()

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
            {showAllPerformanceMetics && (
              <Link to={`/overview`}>
                <ArrowLeftOutlined /> {t('overview.back')}
              </Link>
            )}
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
          <Space>
            {!showAllPerformanceMetics && (
              <Link to={`/overview/detail`}>
                <Button type="primary">
                  {t('overview.view_more_metrics')}
                </Button>
              </Link>
            )}
          </Space>
        </Toolbar>
      </Card>

      <ChartContext.Provider value={useEventEmitter<PointerEvent>()}>
        <Stack tokens={{ childrenGap: 16 }}>
          <Card noMarginTop noMarginBottom noMarginRight>
            <Collapse defaultActiveKey={['1']} ghost>
              <Collapse.Panel
                header="Application Connection"
                key="1"
                style={{ fontSize: 16, fontWeight: 500 }}
              >
                <Row gutter={[16, 16]}>
                  <Col xl={12} sm={24}>
                    <Connection {...metricProps('connection')} />
                  </Col>
                  <Col xl={12} sm={24}>
                    <Disconnection {...metricProps('disconneciton')} />
                  </Col>
                  <Col xl={12} sm={24}>
                    <ConnectionIdleDuration
                      {...metricProps('connection_idle_duration')}
                    />
                  </Col>
                </Row>
              </Collapse.Panel>
            </Collapse>

            <Collapse defaultActiveKey={['2']} ghost>
              <Collapse.Panel
                header="Database Time"
                key="2"
                style={{ fontSize: 16, fontWeight: 500 }}
              >
                <Row gutter={[16, 16]}>
                  <Col xl={12} sm={24}>
                    <DatabaseTime {...metricProps('database_time')} />
                  </Col>
                  <Col xl={12} sm={24}>
                    <DatabaseTimeByPhrase
                      {...metricProps('database_time_by_phrase')}
                    />
                  </Col>
                </Row>
              </Collapse.Panel>
            </Collapse>

            {showAllPerformanceMetics && (
              <>
                <Collapse ghost>
                  <Collapse.Panel
                    header="SQL Count"
                    key="3"
                    style={{ fontSize: 16, fontWeight: 500 }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col xl={12} sm={24}>
                        <QPS {...metricProps('qps')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <FailedQuery {...metricProps('failed_query')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <CPS {...metricProps('cps')} />
                      </Col>
                    </Row>
                  </Collapse.Panel>
                </Collapse>

                <Collapse ghost>
                  <Collapse.Panel
                    header="Core Feature Usage"
                    key="4"
                    style={{ fontSize: 16, fontWeight: 500 }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col xl={12} sm={24}>
                        <DatabaseTime {...metricProps('database_time')} />
                      </Col>
                    </Row>
                  </Collapse.Panel>
                </Collapse>

                <Collapse ghost>
                  <Collapse.Panel
                    header="Latency break down"
                    key="5"
                    style={{ fontSize: 16, fontWeight: 500 }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col xl={12} sm={24}>
                        <OPS {...metricProps('ops')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <Latency {...metricProps('latency')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <GetTokenDuration {...metricProps('get_token')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <ParseDuration {...metricProps('parse')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <CompileDuration {...metricProps('compile')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <ExecDuration {...metricProps('execution')} />
                      </Col>
                    </Row>
                  </Collapse.Panel>
                </Collapse>

                <Collapse ghost>
                  <Collapse.Panel
                    header="Transaction"
                    key="6"
                    style={{ fontSize: 16, fontWeight: 500 }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col xl={12} sm={24}>
                        <Transaction {...metricProps('tps')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <TransactionDuration
                          {...metricProps('average_duration')}
                        />
                      </Col>
                    </Row>
                  </Collapse.Panel>
                </Collapse>

                <Collapse ghost>
                  <Collapse.Panel
                    header="Server"
                    key="7"
                    style={{ fontSize: 16, fontWeight: 500 }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col xl={12} sm={24}>
                        <TiDBUptime {...metricProps('tidb_uptime')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <TiDBCPUUsage {...metricProps('tidb_cpu_usage')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <TiDBMemoryUsage
                          {...metricProps('tidb_memory_usage')}
                        />
                      </Col>
                      <Col xl={12} sm={24}>
                        <TiKVUptime {...metricProps('tikv_uptime')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <TiKVCPUUsage {...metricProps('tikv_cpu_usage')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <TiKVMemoryUsage
                          {...metricProps('tikv_memory_usage')}
                        />
                      </Col>
                      <Col xl={12} sm={24}>
                        <TiKVIO {...metricProps('tikv_io_mbps')} />
                      </Col>
                      <Col xl={12} sm={24}>
                        <TiKVStorageUsage
                          {...metricProps('tikv_storage_usage')}
                        />
                      </Col>
                    </Row>
                  </Collapse.Panel>
                </Collapse>
              </>
            )}
          </Card>
        </Stack>
      </ChartContext.Provider>
    </>
  )
}
