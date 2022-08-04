import { Space, Typography, Button, Tooltip } from 'antd'
import React, { useCallback, useContext, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AutoRefreshButton,
  Card,
  DEFAULT_TIME_RANGE,
  GraphType,
  MetricChart,
  TimeRange,
  TimeRangeSelector,
  Toolbar
} from '@lib/components'
import { Link } from 'react-router-dom'
import { Stack } from 'office-ui-fabric-react'
import { useTimeRangeValue } from '@lib/components/TimeRangeSelector/hook'
import { LoadingOutlined, FileTextOutlined } from '@ant-design/icons'
import { debounce } from 'lodash'
import { OverviewContext } from '../context'

import { PointerEvent } from '@elastic/charts'
import { ChartContext } from '@lib/components/MetricChart/ChartContext'
import { useEventEmitter, useMemoizedFn } from 'ahooks'
import { overviewMetrics } from '../data/overviewMetrics'

export default function Metrics() {
  const ctx = useContext(OverviewContext)

  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE)
  const [chartRange, setChartRange] = useTimeRangeValue(timeRange, setTimeRange)
  const loadingCounter = useRef(0)
  const [isSomeLoading, setIsSomeLoading] = useState(false)
  const { t } = useTranslation()

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
            />
            <AutoRefreshButton
              onRefresh={() => setTimeRange((r) => ({ ...r }))}
              disabled={isSomeLoading}
            />
            <Tooltip placement="top" title={t('overview.panel_no_data_tips')}>
              <a
                href="https://docs.pingcap.com/tidbcloud/built-in-monitoring "
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileTextOutlined />
              </a>
            </Tooltip>
            {isSomeLoading && <LoadingOutlined />}
          </Space>
          <Space>
            <Link to={`/monitoring`}>
              <Button type="primary">{t('overview.view_more_metrics')}</Button>
            </Link>
          </Space>
        </Toolbar>
      </Card>
      <ChartContext.Provider value={useEventEmitter<PointerEvent>()}>
        <Stack tokens={{ childrenGap: 16 }}>
          {overviewMetrics.map((item) => (
            <Card noMarginTop noMarginBottom>
              <Typography.Title level={5}>
                {t(`overview.metrics.${item.title}`)}
              </Typography.Title>
              <MetricChart
                queries={item.queries}
                type={item.type as GraphType}
                unit={item.unit!}
                nullValue={item.nullValue}
                range={chartRange}
                onRangeChange={setChartRange}
                getMetrics={ctx!.ds.metricsQueryGet}
                onLoadingStateChange={onLoadingStateChange}
              />
            </Card>
          ))}
        </Stack>
      </ChartContext.Provider>
    </>
  )
}
