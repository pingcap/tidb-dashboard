import { Space, Typography, Button } from 'antd'
import React, { useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AutoRefreshButton,
  Card,
  DEFAULT_TIME_RANGE,
  MetricChart,
  TimeRange,
  TimeRangeSelector,
  Toolbar
} from '@lib/components'
import { Link } from 'react-router-dom'
import { Range } from '@elastic/charts/dist/utils/domain'
import { Stack } from 'office-ui-fabric-react'
import { useTimeRangeValue } from '@lib/components/TimeRangeSelector/hook'
import { LoadingOutlined } from '@ant-design/icons'
import { some } from 'lodash'
import { ReqConfig } from '@lib/types'
import { MetricsQueryResponse } from '@lib/client'
import { AxiosPromise } from 'axios'
import { OverviewContext } from '../context'

import { PointerEvent } from '@elastic/charts'
import { ChartContext } from '@lib/components/MetricChart/ChartContext'
import { useEventEmitter } from 'ahooks'
import { overviewMetrics } from '../data/overviewMetrics'

interface IChartProps {
  range: Range
  onRangeChange?: (newRange: Range) => void
  onLoadingStateChange?: (isLoading: boolean) => void
  getMetrics: (
    endTimeSec?: number,
    query?: string,
    startTimeSec?: number,
    stepSec?: number,
    options?: ReqConfig
  ) => AxiosPromise<MetricsQueryResponse>
}

const MetricsWrapper = ({ metricsItem, props }) => {
  const { t } = useTranslation()

  return (
    <Card noMarginTop noMarginBottom>
      <Typography.Title level={5}>
        {t(`overview.metrics.${metricsItem.title}`)}
      </Typography.Title>
      <MetricChart
        queries={metricsItem.queries}
        yDomain={
          metricsItem.yDomain
            ? { min: metricsItem.yDomain.min, max: metricsItem.yDomain.max }
            : null
        }
        type={metricsItem.type}
        unit={metricsItem.unit}
        {...props}
      />
    </Card>
  )
}

export default function Metrics() {
  const ctx = useContext(OverviewContext)

  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE)
  const [chartRange, setChartRange] = useTimeRangeValue(timeRange, setTimeRange)
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
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
      getMetrics: ctx!.ds.metricsQueryGet
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
          <Space>
            <Link to={`/metrics`}>
              <Button type="primary">{t('overview.view_more_metrics')}</Button>
            </Link>
          </Space>
        </Toolbar>
      </Card>
      <ChartContext.Provider value={useEventEmitter<PointerEvent>()}>
        <Stack tokens={{ childrenGap: 16 }}>
          {overviewMetrics.map((item) => (
            <MetricsWrapper
              metricsItem={item}
              props={metricProps(`${item.title}`)}
            />
          ))}
        </Stack>
      </ChartContext.Provider>
    </>
  )
}
