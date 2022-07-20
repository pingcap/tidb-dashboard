import { Space, Typography, Row, Col, Collapse } from 'antd'
import React, { useCallback, useContext, useRef, useState } from 'react'
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
import { Stack } from 'office-ui-fabric-react'
import { useTimeRangeValue } from '@lib/components/TimeRangeSelector/hook'
import { LoadingOutlined } from '@ant-design/icons'
import { MetricsContext } from '../context'

import { PointerEvent } from '@elastic/charts'
import { ChartContext } from '@lib/components/MetricChart/ChartContext'
import { useEventEmitter, useMemoizedFn } from 'ahooks'
import { metricsItems } from '../data/metricsItems'
import { throttle } from 'lodash'

export default function Metrics() {
  const ctx = useContext(MetricsContext)
  const { t } = useTranslation()

  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE)
  const [chartRange, setChartRange] = useTimeRangeValue(timeRange, setTimeRange)
  const loadingCounter = useRef(0)
  const [isSomeLoading, setIsSomeLoading] = useState(false)

  const setIsSomeLoadingDebounce = useCallback(
    throttle(setIsSomeLoading, 50),
    []
  )

  const onLoadingStateChange = useMemoizedFn((loading: boolean) => {
    loading
      ? (loadingCounter.current += 1)
      : loadingCounter.current > 0 && (loadingCounter.current -= 1)
    setIsSomeLoadingDebounce(loadingCounter.current > 0)
  })
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
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    padding: 0,
                    marginLeft: -16
                  }}
                >
                  <Row gutter={[16, 16]}>
                    {item.metrics.map((m) => (
                      <Col xl={12} sm={24} key={m.title}>
                        <Card
                          noMargin
                          style={{
                            border: '1px solid #f1f0f0',
                            padding: '10px 2rem',
                            backgroundColor: '#fcfcfd'
                          }}
                        >
                          <Typography.Title
                            level={5}
                            style={{ textAlign: 'center' }}
                          >
                            {m.title}
                          </Typography.Title>
                          <MetricChart
                            queries={m.queries}
                            type={m.type}
                            unit={m.unit}
                            nullValue={m.nullValue}
                            range={chartRange}
                            onRangeChange={setChartRange}
                            getMetrics={ctx!.ds.metricsQueryGet}
                            onLoadingStateChange={onLoadingStateChange}
                          />
                        </Card>
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
