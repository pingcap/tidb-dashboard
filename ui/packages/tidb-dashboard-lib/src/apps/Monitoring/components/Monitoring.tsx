import { Space, Typography, Row, Col, Collapse, Tooltip } from 'antd'
import React, { useCallback, useContext, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Stack } from 'office-ui-fabric-react'
import { LoadingOutlined, FileTextOutlined } from '@ant-design/icons'
import { useMemoizedFn } from 'ahooks'
import {
  MetricsChart,
  SyncChartPointer,
  TimeRangeValue,
  QueryConfig,
  TransformNullValue
} from 'metrics-chart'
import { Link } from 'react-router-dom'
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
import { store } from '@lib/utils/store'
import { tz } from '@lib/utils'
import { telemetry } from '../utils/telemetry'
import { MonitoringContext } from '../context'

export default function Monitoring() {
  const ctx = useContext(MonitoringContext)
  const info = store.useState((s) => s.appInfo)
  const pdVersion = info?.version?.pd_version
  const [isSomeLoading, setIsSomeLoading] = useState(false)
  const { t } = useTranslation()

  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE)

  const handleManualRefreshClick = () => {
    telemetry.clickManualRefresh()
    return setTimeRange((r) => ({ ...r }))
  }

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
              <Tooltip
                placement="top"
                title={t('monitoring.panel_no_data_tips')}
              >
                <a
                  href={ctx?.cfg.metricsReferenceLink}
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
        </Toolbar>
      </Card>
      <SyncChartPointer>
        <Stack tokens={{ childrenGap: 16 }}>
          <Card noMarginTop>
            {ctx?.cfg.getMetricsQueries(pdVersion).map((item) => (
              <>
                {item.category ? (
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
                      <MetricsChartWrapper
                        metrics={item.metrics}
                        timeRange={timeRange}
                        setTimeRange={setTimeRange}
                        setIsSomeLoading={setIsSomeLoading}
                      />
                    </Collapse.Panel>
                  </Collapse>
                ) : (
                  <MetricsChartWrapper
                    metrics={item.metrics}
                    timeRange={timeRange}
                    setTimeRange={setTimeRange}
                    setIsSomeLoading={setIsSomeLoading}
                  />
                )}
              </>
            ))}
          </Card>
        </Stack>
      </SyncChartPointer>
    </>
  )
}

interface MetricsChartWrapperProps {
  metrics: {
    title: string
    queries: QueryConfig[]
    unit: string
    nullValue?: TransformNullValue
  }[]
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
  const ctx = useContext(MonitoringContext)
  const loadingCounter = useRef(0)
  const [chartRange, setChartRange] = useTimeRangeValue(timeRange, setTimeRange)
  const { t } = useTranslation()
  const promAddrConfigurable = ctx?.cfg.promAddrConfigurable || false

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
      {promAddrConfigurable && (
        <Link to="/user_profile?blink=profile.prometheus">
          {t('monitoring.change_prom_button')}
        </Link>
      )}
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
              onClickSeriesLabel={(seriesName) =>
                telemetry.clickSeriesLabel(item.title, seriesName)
              }
            />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
