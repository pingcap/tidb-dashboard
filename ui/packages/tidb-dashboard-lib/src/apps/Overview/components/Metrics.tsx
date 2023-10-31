import { Space, Typography, Button, Tooltip } from 'antd'
import React, { useCallback, useContext, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMemoizedFn } from 'ahooks'
import { MetricsChart, SyncChartPointer, TimeRangeValue } from 'metrics-chart'
import { Link } from 'react-router-dom'
import { Stack } from 'office-ui-fabric-react'
import { LoadingOutlined, FileTextOutlined } from '@ant-design/icons'
import { debounce } from 'lodash'

import {
  AutoRefreshButton,
  Card,
  DEFAULT_TIME_RANGE,
  TimeRange,
  Toolbar,
  ErrorBar,
  LimitTimeRange
} from '@lib/components'
import { useTimeRangeValue } from '@lib/components/TimeRangeSelector/hook'

import { OverviewContext } from '../context'
import { telemetry } from '../utils/telemetry'

export default function Metrics() {
  const ctx = useContext(OverviewContext)
  const promAddrConfigurable = ctx?.cfg.promAddrConfigurable || false

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

  const handleManualRefreshClick = () => {
    telemetry.clickManualRefresh()
    return setTimeRange((r) => ({ ...r }))
  }

  const handleOnBrush = (range: TimeRangeValue) => {
    setChartRange(range)
  }

  const ErrorComponent = (error: Error) => (
    <Space direction="vertical">
      <ErrorBar errors={[error]} />
      {promAddrConfigurable && (
        <Link to="/user_profile?blink=profile.prometheus">
          {t('overview.change_prom_button')}
        </Link>
      )}
    </Space>
  )

  return (
    <>
      <Card>
        <Toolbar>
          <Space>
            <LimitTimeRange
              value={timeRange}
              recent_seconds={ctx?.cfg.timeRangeSelector?.recent_seconds}
              customAbsoluteRangePicker={
                ctx?.cfg.timeRangeSelector?.customAbsoluteRangePicker
              }
              onChange={(v) => {
                setTimeRange(v)
                telemetry.selectTimeRange(v)
              }}
              onZoomOutClick={(start, end) =>
                telemetry.clickZoomOut([start, end])
              }
            />
            <AutoRefreshButton
              onChange={telemetry.selectAutoRefreshOption}
              onRefresh={handleManualRefreshClick}
              disabled={isSomeLoading}
            />
            {ctx?.cfg.metricsReferenceLink && (
              <Tooltip placement="top" title={t('overview.panel_no_data_tips')}>
                <a
                  href={ctx.cfg.metricsReferenceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileTextOutlined
                    onClick={() => telemetry.clickDocumentationIcon()}
                  />
                </a>
              </Tooltip>
            )}
            {isSomeLoading && <LoadingOutlined />}
          </Space>
          <Space>
            <Link to={`/monitoring`}>
              <Button type="primary" onClick={telemetry.clickViewMoreMetrics}>
                {t('overview.view_more_metrics')}
              </Button>
            </Link>
          </Space>
        </Toolbar>
      </Card>
      <SyncChartPointer>
        <Stack tokens={{ childrenGap: 16 }}>
          {ctx?.cfg.metricsQueries.map((item) => (
            <Card noMarginTop noMarginBottom>
              <Typography.Title level={5}>
                {t(`overview.metrics.${item.title}`)}
              </Typography.Title>
              <MetricsChart
                queries={item.queries}
                range={chartRange}
                nullValue={item.nullValue}
                unit={item.unit!}
                fetchPromeData={ctx!.ds.metricsQueryGet}
                onLoading={onLoadingStateChange}
                onBrush={handleOnBrush}
                errorComponent={ErrorComponent}
                onClickSeriesLabel={(seriesName) =>
                  telemetry.clickSeriesLabel(item.title, seriesName)
                }
              />
            </Card>
          ))}
        </Stack>
      </SyncChartPointer>
    </>
  )
}
