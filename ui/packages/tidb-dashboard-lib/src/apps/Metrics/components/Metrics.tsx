import { Space, Typography, Row, Col, Collapse } from 'antd'
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
import { Range } from '@elastic/charts/dist/utils/domain'
import { Stack } from 'office-ui-fabric-react'
import { useTimeRangeValue } from '@lib/components/TimeRangeSelector/hook'
import { LoadingOutlined } from '@ant-design/icons'
import { some } from 'lodash'
import { ReqConfig } from '@lib/types'
import { MetricsQueryResponse } from '@lib/client'
import { AxiosPromise } from 'axios'
import { MetricsContext } from '../context'

import { PointerEvent } from '@elastic/charts'
import { ChartContext } from '@lib/components/MetricChart/ChartContext'
import { useEventEmitter } from 'ahooks'
import { metricsItems } from '../data/metricsItems'

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
  return (
    <Card
      noMargin
      style={{
        border: '1px solid #f1f0f0',
        padding: '10px 2rem',
        backgroundColor: '#fcfcfd'
      }}
    >
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {metricsItem.title}
      </Typography.Title>
      <MetricChart
        queries={metricsItem.queries}
        type={metricsItem.type}
        unit={metricsItem.unit}
        nullValue={metricsItem.nullValue}
        {...props}
      />
    </Card>
  )
}

export default function Metrics() {
  const ctx = useContext(MetricsContext)
  const { t } = useTranslation()

  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE)
  const [chartRange, setChartRange] = useTimeRangeValue(timeRange, setTimeRange)
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})

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
        </Toolbar>
      </Card>
      <ChartContext.Provider value={useEventEmitter<PointerEvent>()}>
        <Stack tokens={{ childrenGap: 16 }}>
          <Card noMarginTop noMarginBottom noMarginRight>
            {metricsItems.map((item) => (
              <Collapse defaultActiveKey={['1']} ghost key={item.category}>
                <Collapse.Panel
                  header={t(`metrics.category.${item.category}`)}
                  key="1"
                  style={{ fontSize: 16, fontWeight: 500, padding: 0 }}
                >
                  <Row gutter={[16, 16]}>
                    {item.metrics.map((m) => (
                      <Col xl={12} sm={24} key={m.title}>
                        <MetricsWrapper
                          metricsItem={m}
                          props={metricProps(`${m.title}`)}
                        />
                      </Col>
                    ))}
                  </Row>
                </Collapse.Panel>
              </Collapse>
            ))}
          </Card>
        </Stack>
      </ChartContext.Provider>
    </>
  )
}
