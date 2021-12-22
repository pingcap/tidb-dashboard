import { XYBrushArea, BrushEndListener } from '@elastic/charts'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Space, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { ZoomOutOutlined } from '@ant-design/icons'

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
} from '@lib/components'
import { InstanceSelect, InstanceId } from '../../components/Filter'
import styles from './List.module.less'
import { ListTable } from './ListTable'
import { ListChart } from './ListChart'
import { convertOthersRecord } from '../../utils/othersRecord'
import { createUseTimeWindowSize } from '../../utils/useTimeWindowSize'

const autoRefreshOptions = [15, 30, 60, 2 * 60, 5 * 60, 10 * 60]
const zoomOutRate = 0.5
const useTimeWindowSize = createUseTimeWindowSize(10)

export function TopSQLList() {
  const { t } = useTranslation()
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useLocalStorageState(
    'topsql_auto_refresh',
    0
  )
  const [instanceId, setInstanceId] = useURLQueryState('instance_id')
  const [recentTimeRange, setRecentTimeRange] = useLocalStorageState(
    'topsql_recent_time_range',
    DEFAULT_TIME_RANGE
  )
  const [timeRange, setTimeRange] = useState<TimeRange>(recentTimeRange)
  const { timeWindowSize, computeTimeWindowSize, isTimeWindowSizeComputed } =
    useTimeWindowSize()
  const { topSQLData, updateTopSQLData, isLoading, queryTimestampRange } =
    useTopSQLData(instanceId, timeRange, timeWindowSize, '5')

  const handleSetInstance = useCallback((id: string) => {
    setInstanceId(id)
    setTimeRange(recentTimeRange)
  }, [])

  const setAbsoluteTimeRange = useCallback((t: [number, number]) => {
    setAutoRefreshSeconds(0)
    setTimeRange({ type: 'absolute', value: t })
  }, [])

  const handleTimeRangeChange = useCallback((v: TimeRange) => {
    setTimeRange(v)
    if (v.type === 'recent') {
      setRecentTimeRange(v)
    }
  }, [])

  const handleBrushEnd: BrushEndListener = useCallback((v: XYBrushArea) => {
    if (v.x) {
      setAbsoluteTimeRange(
        v.x.map((d) => Math.ceil(d / 1000)) as [number, number]
      )
    }
  }, [])

  const zoomOut = useCallback(() => {
    const [start, end] = calcTimeRange(timeRange)
    setAbsoluteTimeRange([start - (end - start) * zoomOutRate, end])
  }, [timeRange])

  const handleAutoRefreshSecondsChange = useCallback((v: number) => {
    setAutoRefreshSeconds(v)
    setTimeRange(recentTimeRange)
  }, [])

  useEffect(() => {
    if (!isTimeWindowSizeComputed) {
      return
    }
    updateTopSQLData()
  }, [instanceId, timeWindowSize, isTimeWindowSizeComputed])

  // Calculate time window size by container width and time range
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const timeRangeTimestamp = calcTimeRange(timeRange)
    const delta = timeRangeTimestamp[1] - timeRangeTimestamp[0]
    computeTimeWindowSize(containerRef.current?.offsetWidth || 0, delta)
  }, [containerRef, timeRange])

  return (
    <div className={styles.container} ref={containerRef}>
      <Card>
        <Space size="middle">
          <InstanceSelect value={instanceId} onChange={handleSetInstance} />
          <Button.Group>
            <TimeRangeSelector
              value={timeRange}
              onChange={handleTimeRangeChange}
            />
            <Button icon={<ZoomOutOutlined />} onClick={zoomOut} />
          </Button.Group>
          <AutoRefreshButton
            autoRefreshSeconds={autoRefreshSeconds}
            onAutoRefreshSecondsChange={handleAutoRefreshSecondsChange}
            isLoading={isLoading}
            onRefresh={updateTopSQLData}
            options={autoRefreshOptions}
          />
        </Space>
      </Card>
      {!!topSQLData?.length ? (
        <>
          <div className={styles.chart_container}>
            <ListChart
              onBrushEnd={handleBrushEnd}
              data={topSQLData}
              timeRangeTimestamp={queryTimestampRange}
              timeWindowSize={timeWindowSize}
            />
          </div>
          <ListTable data={topSQLData} />
        </>
      ) : (
        !isLoading && (
          <p style={{ marginTop: '100px', textAlign: 'center' }}>
            {t('top_sql.no_data')}
          </p>
        )
      )}
    </div>
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
