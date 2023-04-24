import { TimeRangeSelector } from '@lib/components'
import { Space, Typography, Row, Col } from 'antd'
import React, { useCallback, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { MetricsChart, SyncChartPointer, TimeRangeValue } from 'metrics-chart'
import { debounce } from 'lodash'
import { Card, TimeRange, ErrorBar } from '@lib/components'
import { tz } from '@lib/utils'
import { useTimeRangeValue } from '@lib/components/TimeRangeSelector/hook'
import { useResourceManagerContext } from '../context'
import { useResourceManagerUrlState } from '../uilts/url-state'
import { MetricConfig, metrics } from '../uilts/metricQueries'
import { useTranslation } from 'react-i18next'

export const Metrics: React.FC = () => {
  const { timeRange, setTimeRange } = useResourceManagerUrlState()
  const [, setIsSomeLoading] = useState(false)
  const { t } = useTranslation()

  return (
    <Card title={t('resource_manager.metrics.title')}>
      <div style={{ marginBottom: 24 }}>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <SyncChartPointer>
        <MetricsChartWrapper
          metrics={metrics}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          setIsSomeLoading={setIsSomeLoading}
        />
      </SyncChartPointer>
    </Card>
  )
}

interface MetricsChartWrapperProps {
  metrics: MetricConfig[]
  timeRange: TimeRange
  setTimeRange: (timeRange: TimeRange) => void
  setIsSomeLoading: (isLoading: boolean) => void
}

const MetricsChartWrapper: React.FC<MetricsChartWrapperProps> = ({
  metrics,
  timeRange,
  setTimeRange,
  setIsSomeLoading
}) => {
  const ctx = useResourceManagerContext()
  const loadingCounter = useRef(0)
  const [chartRange, setChartRange] = useTimeRangeValue(timeRange, setTimeRange)

  // eslint-disable-next-line
  const setIsSomeLoadingDebounce = useCallback(
    debounce(setIsSomeLoading, 100, { leading: true }),
    []
  )

  const handleOnBrush = (range: TimeRangeValue) => {
    setChartRange(range)
  }

  const onLoadingStateChange = useMemoizedFn((loading: boolean) => {
    loading
      ? (loadingCounter.current += 1)
      : loadingCounter.current > 0 && (loadingCounter.current -= 1)
    setIsSomeLoadingDebounce(loadingCounter.current > 0)
  })

  const ErrorComponent = (error: Error) => (
    <Space direction="vertical">
      <ErrorBar errors={[error]} />
    </Space>
  )

  return (
    <Row gutter={[16, 16]}>
      {metrics.map((item) => (
        <Col xl={12} sm={24} key={item.title}>
          <Card
            noMargin
            style={{
              border: '1px solid #f1f0f0',
              padding: '10px 2rem',
              backgroundColor: '#fcfcfd'
            }}
          >
            <Typography.Title level={5} style={{ textAlign: 'center' }}>
              {item.title}
            </Typography.Title>
            <MetricsChart
              queries={item.queries}
              range={chartRange}
              nullValue={item.nullValue}
              unit={item.unit!}
              timezone={tz.getTimeZone()}
              fetchPromeData={ctx!.ds.metricsQueryGet}
              onLoading={onLoadingStateChange}
              onBrush={handleOnBrush}
              errorComponent={ErrorComponent}
            />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
