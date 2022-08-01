import { Space, Typography, Row, Col, Collapse, Tooltip } from 'antd'
import React, { useCallback, useContext, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AutoRefreshButton,
  Card,
  DEFAULT_TIME_RANGE,
  MetricChart,
  TimeRange,
  TimeRangeSelector,
  GraphType,
  Toolbar
} from '@lib/components'
import { Stack } from 'office-ui-fabric-react'
import { useTimeRangeValue } from '@lib/components/TimeRangeSelector/hook'
import { LoadingOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { MonitoringContext } from '../context'

import { PointerEvent } from '@elastic/charts'
import { ChartContext } from '@lib/components/MetricChart/ChartContext'
import { useEventEmitter, useMemoizedFn } from 'ahooks'
import { debounce } from 'lodash'

export default function Monitoring() {
  const ctx = useContext(MonitoringContext)
  const { t } = useTranslation()

  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE)
  const [chartRange, setChartRange] = useTimeRangeValue(timeRange, setTimeRange)
  const loadingCounter = useRef(0)
  const [isSomeLoading, setIsSomeLoading] = useState(false)

  // eslint-disable-next-line
  const setIsSomeLoadingDebounce = useCallback(
    debounce(setIsSomeLoading, 100, { leading: true }),
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
              recent_seconds={ctx?.cfg.timeRangeSelector?.recent_seconds}
              withAbsoluteRangePicker={
                ctx?.cfg.timeRangeSelector?.withAbsoluteRangePicker
              }
            />
            <AutoRefreshButton
              onRefresh={() => setTimeRange((r) => ({ ...r }))}
              disabled={isSomeLoading}
            />
            <Tooltip placement="top" title={t('monitoring.panel_no_data_tips')}>
              <a
                href={t('monitoring.info_doc_href')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <QuestionCircleOutlined />
              </a>
            </Tooltip>
            {isSomeLoading && <LoadingOutlined />}
          </Space>
        </Toolbar>
      </Card>
      <ChartContext.Provider value={useEventEmitter<PointerEvent>()}>
        <Stack tokens={{ childrenGap: 16 }}>
          <Card noMarginTop noMarginBottom>
            {ctx!.cfg.metricsQueries.map((item) => (
              <Collapse defaultActiveKey={['1']} ghost key={item.category}>
                <Collapse.Panel
                  header={t(`monitoring.category.${item.category}`)}
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
                            type={m.type as GraphType}
                            unit={m.unit}
                            nullValue={m.nullValue}
                            range={chartRange}
                            onRangeChange={setChartRange}
                            getMetrics={ctx!.ds.metricsQueryGet}
                            onLoadingStateChange={onLoadingStateChange}
                            promAddrConfigurable={
                              ctx!.cfg.promeAddrConfigurable
                            }
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
