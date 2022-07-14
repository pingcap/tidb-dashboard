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

import MetricsItems from './MetricsItems'

interface IChartProps {
  range: Range
  onRangeChange?: (newRange: Range) => void
  onLoadingStateChange?: (isLoading: boolean) => void
}

const MetricsWrapper = (props) => {
  const { t } = useTranslation()
  const { metricsItem, metricProps } = props
  return (
    <Card noMarginTop noMarginBottom noMarginLeft>
      <Typography.Title level={5} style={{ textAlign: 'center' }}>
        {t(`overview.metrics.${metricsItem.title}`)}
      </Typography.Title>
      <MetricChart
        queries={metricsItem.queries}
        type={metricsItem.type}
        unit={metricsItem.unit}
        {...metricProps}
      />
    </Card>
  )
}

export default function Metrics(props) {
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE)
  const [chartRange, setChartRange] = useTimeRangeValue(timeRange, setTimeRange)
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const { showAllPanels: showAllPerformanceMetics } = props
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
            {MetricsItems.map((item, idx) => (
              <>
                {((idx > 1 && showAllPerformanceMetics) || idx < 2) && (
                  <Collapse defaultActiveKey={['1']} ghost key={item.category}>
                    <Collapse.Panel
                      header={item.category}
                      key="1"
                      style={{ fontSize: 16, fontWeight: 500 }}
                    >
                      <Row gutter={[16, 16]}>
                        {item.metrics.map((m) => (
                          <Col xl={12} sm={24} key={m.title}>
                            <MetricsWrapper
                              metricsItem={m}
                              metricProps={metricProps(`${m.title}`)}
                            />
                          </Col>
                        ))}
                      </Row>
                    </Collapse.Panel>
                  </Collapse>
                )}
              </>
            ))}
          </Card>
        </Stack>
      </ChartContext.Provider>
    </>
  )
}
