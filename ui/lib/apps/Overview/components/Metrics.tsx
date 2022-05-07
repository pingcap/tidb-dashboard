import { Space, Typography } from 'antd'
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
import { Range } from '@elastic/charts/dist/utils/domain'
import { Stack } from 'office-ui-fabric-react'
import { useTimeRangeValue } from '@lib/components/TimeRangeSelector/hook'
import { LoadingOutlined } from '@ant-design/icons'
import { some } from 'lodash'

interface IChartProps {
  range: Range
  onRangeChange?: (newRange: Range) => void
  onLoadingStateChange?: (isLoading: boolean) => void
}

function QPS(props: IChartProps) {
  const { t } = useTranslation()
  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t('overview.metrics.total_requests')}
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
        type="bar_stacked"
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
        {t('overview.metrics.latency')}
      </Typography.Title>
      <MetricChart
        queries={[
          {
            query:
              'histogram_quantile(0.9, sum(rate(tidb_server_handle_query_duration_seconds_bucket[$__rate_interval])) by (le))',
            name: '95%',
          },
          {
            query:
              'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket[$__rate_interval])) by (le))',
            name: '99%',
          },
          {
            query:
              'histogram_quantile(0.999, sum(rate(tidb_server_handle_query_duration_seconds_bucket[$__rate_interval])) by (le))',
            name: '99.9%',
          },
        ]}
        unit="s"
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

  const isSomeLoading = useMemo(() => {
    return some(Object.values(isLoading))
  }, [isLoading])

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
      <Stack tokens={{ childrenGap: 16 }}>
        <QPS
          range={chartRange}
          onRangeChange={setChartRange}
          onLoadingStateChange={(loading) =>
            setIsLoading((v) => ({ ...v, qps: loading }))
          }
        />
        <Latency
          range={chartRange}
          onRangeChange={setChartRange}
          onLoadingStateChange={(loading) =>
            setIsLoading((v) => ({ ...v, latency: loading }))
          }
        />
      </Stack>
    </>
  )
}
