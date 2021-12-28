import { XYBrushArea, BrushEndListener } from '@elastic/charts'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Space, Button, Spin, Alert, Tooltip, Drawer } from 'antd'
import {
  ZoomOutOutlined,
  LoadingOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useGetSet } from 'react-use'
import { useTranslation } from 'react-i18next'

import '@elastic/charts/dist/theme_only_light.css'

import client, { TopsqlCPUTimeItem } from '@lib/client'
import { useLocalStorageState } from '@lib/utils/useLocalStorageState'
import { useURLQueryState } from '@lib/utils/useURLQueryState'
import {
  Card,
  AutoRefreshButton,
  TimeRangeSelector,
  TimeRange,
  calcTimeRange,
  DEFAULT_TIME_RANGE,
  Toolbar,
} from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'

import { InstanceSelect, InstanceId } from '../../components/Filter'
import styles from './List.module.less'
import { ListTable } from './ListTable'
import { ListChart } from './ListChart'
import { convertOthersRecord } from '../../utils/othersRecord'
import { createUseTimeWindowSize } from '../../utils/useTimeWindowSize'
import { SettingsForm } from './SettingsForm'

const autoRefreshOptions = [15, 30, 60, 2 * 60, 5 * 60, 10 * 60]
const zoomOutRate = 0.5
const minDate = new Date('2015-08-03')
const minDateTimestamp = minDate.getTime() / 1000
const useTimeWindowSize = createUseTimeWindowSize(10)

export function TopSQLList() {
  const { t } = useTranslation()
  const {
    data: topSQLConfig,
    isLoading: isConfigLoading,
    sendRequest: updateConfig,
  } = useClientRequest((reqConfig) =>
    client.getInstance().topsqlConfigGet(reqConfig)
  )
  const [showSettings, setShowSettings] = useState(false)
  const [remainingRefreshSeconds, setRemainingRefreshSeconds] = useState(0)
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useLocalStorageState(
    'topsql_auto_refresh',
    0
  )
  const [instanceId, setInstanceId] = useURLQueryState('instance_id')
  const [recentTimeRange, setRecentTimeRange] = useLocalStorageState(
    'topsql_recent_time_range',
    DEFAULT_TIME_RANGE
  )
  const [getTimeRange, setTimeRange] = useGetSet<TimeRange>(recentTimeRange)
  const { timeWindowSize, computeTimeWindowSize, isTimeWindowSizeComputed } =
    useTimeWindowSize()
  const {
    topSQLData,
    updateTopSQLData,
    isLoading: isDataLoading,
    queryTimestampRange,
  } = useTopSQLData(instanceId, getTimeRange(), timeWindowSize, '5')
  const isLoading = isConfigLoading || isDataLoading

  const handleUpdateTopSQLData = useCallback(() => {
    setRemainingRefreshSeconds(autoRefreshSeconds)
    updateTopSQLData()
  }, [updateTopSQLData, autoRefreshSeconds])

  const setAbsoluteTimeRange = useCallback((t: [number, number]) => {
    setAutoRefreshSeconds(0)
    setTimeRange({
      type: 'absolute',
      value: [Math.ceil(t[0]), Math.floor(t[1])],
    })
  }, [])

  const handleTimeRangeChange = useCallback((v: TimeRange) => {
    if (v.type === 'recent') {
      setTimeRange(v)
      setRecentTimeRange(v)
    } else {
      setAbsoluteTimeRange(v.value)
    }
  }, [])

  const handleBrushEnd: BrushEndListener = useCallback((v: XYBrushArea) => {
    if (v.x) {
      setAbsoluteTimeRange(v.x.map((d) => d / 1000) as [number, number])
    }
  }, [])

  const zoomOut = useCallback(() => {
    const [start, end] = calcTimeRange(getTimeRange())
    const now = Date.now() / 1000
    const interval = end - start

    let endOffset = interval * zoomOutRate
    let computedEnd = end + endOffset
    if (computedEnd > now) {
      computedEnd = now
      endOffset = now - end
    }

    let computedStart = start - interval + endOffset
    if (computedStart < minDateTimestamp) {
      computedStart = minDateTimestamp
    }

    setAbsoluteTimeRange([computedStart, computedEnd])
  }, [])

  const handleAutoRefreshSecondsChange = useCallback(
    (v: number) => {
      setTimeRange(recentTimeRange)
      setAutoRefreshSeconds(v)
    },
    [recentTimeRange]
  )

  // init
  useEffect(() => {
    if (!isTimeWindowSizeComputed) {
      return
    }
    handleUpdateTopSQLData()
  }, [instanceId, timeWindowSize, isTimeWindowSizeComputed])

  // Calculate time window size by container width and time range
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const timeRangeTimestamp = calcTimeRange(getTimeRange())
    const delta = timeRangeTimestamp[1] - timeRangeTimestamp[0]
    computeTimeWindowSize(containerRef.current?.offsetWidth || 0, delta)
  }, [containerRef, getTimeRange()])

  return (
    <>
      <div className={styles.container} ref={containerRef}>
        {!isConfigLoading && !topSQLConfig?.enable && (
          <Card noMarginBottom>
            <Alert
              message={t(`topsql.alert_header.title`)}
              description={t(`topsql.alert_header.body`)}
              type="info"
              showIcon
            />
          </Card>
        )}
        <Card noMarginBottom>
          <Toolbar>
            <Space>
              <InstanceSelect
                value={instanceId}
                onChange={setInstanceId}
                disabled={isLoading}
              />
              <Button.Group>
                <TimeRangeSelector
                  value={getTimeRange()}
                  onChange={handleTimeRangeChange}
                  disabled={isLoading}
                  disabledDate={(current) => {
                    const tooLate = current.isBefore(minDate)
                    const tooEarly = current.isAfter(new Date())
                    return tooLate || tooEarly
                  }}
                />
                <Button
                  icon={<ZoomOutOutlined />}
                  onClick={zoomOut}
                  disabled={isLoading}
                />
              </Button.Group>
              <AutoRefreshButton
                disabled={isLoading}
                autoRefreshSeconds={autoRefreshSeconds}
                onAutoRefreshSecondsChange={handleAutoRefreshSecondsChange}
                remainingRefreshSeconds={remainingRefreshSeconds}
                onRemainingRefreshSecondsChange={setRemainingRefreshSeconds}
                onRefresh={handleUpdateTopSQLData}
                autoRefreshSecondsOptions={autoRefreshOptions}
                disableAutoRefreshOptions={
                  !isConfigLoading && !topSQLConfig?.enable
                }
              />
              {isLoading && (
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
                />
              )}
            </Space>

            <Space>
              <Tooltip title={t('topsql.settings.title')} placement="bottom">
                <SettingOutlined onClick={() => setShowSettings(true)} />
              </Tooltip>
            </Space>
          </Toolbar>
        </Card>
        <div className={styles.chart_container}>
          <ListChart
            onBrushEnd={handleBrushEnd}
            data={topSQLData}
            timeRangeTimestamp={queryTimestampRange}
            timeWindowSize={timeWindowSize}
          />
        </div>
        {!!topSQLData?.length && <ListTable data={topSQLData} />}
      </div>
      <Drawer
        title={t('statement.settings.title')}
        width={300}
        closable={true}
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        destroyOnClose={true}
      >
        <SettingsForm
          onClose={() => setShowSettings(false)}
          onConfigUpdated={updateConfig}
        />
      </Drawer>
    </>
  )
}

const useTopSQLData = (
  instanceId: InstanceId,
  timeRange: TimeRange,
  timeWindowSize: number,
  topN: string
) => {
  const [topSQLData, setTopSQLData] = useState<TopsqlCPUTimeItem[]>([])
  const [queryTimestampRange, setQueryTimestampRange] = useState(
    calcTimeRange(timeRange)
  )
  const [isLoading, setIsLoading] = useState(false)
  const updateTopSQLData = useCallback(async () => {
    if (!instanceId) {
      return
    }

    const [beginTs, endTs] = calcTimeRange(timeRange)
    let data: TopsqlCPUTimeItem[]
    try {
      setIsLoading(true)
      const resp = await client
        .getInstance()
        .topsqlCpuTimeGet(
          endTs as any,
          instanceId,
          beginTs as any,
          topN,
          `${timeWindowSize}s` as any
        )
      data = resp.data.data ?? []
    } finally {
      setIsLoading(false)
    }

    // Sort data by digest
    // If this digest occurs continuously on the timeline, we can easily see the sequential overhead
    data.sort((a, b) => a.sql_digest?.localeCompare(b.sql_digest!) || 0)
    data.forEach((d) => {
      convertOthersRecord(d)
      d.plans?.forEach(
        (item) =>
          (item.timestamp_secs = item.timestamp_secs?.map((t) => t * 1000))
      )
    })

    setTopSQLData(data)
    setQueryTimestampRange([beginTs, endTs])
  }, [instanceId, timeWindowSize, timeRange, topN])

  return { topSQLData, updateTopSQLData, isLoading, queryTimestampRange }
}
