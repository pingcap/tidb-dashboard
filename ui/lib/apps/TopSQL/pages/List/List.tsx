import { XYBrushArea, BrushEndListener } from '@elastic/charts'
import React, { useCallback, useState } from 'react'
import { useQuery } from 'react-query'
import { Spin, Space, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { ZoomOutOutlined } from '@ant-design/icons'

import '@elastic/charts/dist/theme_only_light.css'

import client from '@lib/client'
import { useLocalStorageState } from '@lib/utils/useLocalStorageState'
import { useURLQueryState } from '@lib/utils/useURLQueryState'
import { asyncDebounce } from '@lib/utils/asyncDebounce'
import {
  Card,
  AutoRefreshButton,
  useAutoFreshRemainingSecondsFactory,
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
import {
  useWindowSizeContext,
  useWindowSize,
  WindowSizeContext,
} from '../../utils/useWindowSize'

export function TopSQLList() {
  const windowSizeContext = useWindowSizeContext({ barWidth: 10 })
  return (
    <WindowSizeContext.Provider value={windowSizeContext}>
      <App />
    </WindowSizeContext.Provider>
  )
}

const autoRefreshOptions = [15, 30, 60, 2 * 60, 5 * 60, 10 * 60]
const useAutoRefreshRemainingSeconds = useAutoFreshRemainingSecondsFactory()
const zoomOutRate = 0.5

function App() {
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
  const [refreshTimestamp, setRefreshTimestamp] = useState(0)
  const { seriesData, queryTimestampRange, isLoading } = useSeriesData(
    instanceId,
    timeRange,
    autoRefreshSeconds,
    refreshTimestamp
  )

  const setAbsoluteTimeRange = useCallback((tr: [number, number]) => {
    setAutoRefreshSeconds(0)
    setTimeRange({ type: 'absolute', value: tr })
  }, [])

  const handleSetTimeRange = useCallback((v: TimeRange) => {
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

  const handleZoomOut = useCallback(() => {
    const [start, end] = calcTimeRange(timeRange)
    setAbsoluteTimeRange([start - (end - start) * zoomOutRate, end])
  }, [timeRange])

  const refreshTimestampRange = useCallback(() => {
    setRefreshTimestamp(Date.now())
  }, [])

  const { remainingRefreshSeconds } = useAutoRefreshRemainingSeconds(
    autoRefreshSeconds,
    [queryTimestampRange]
  )

  const handleAutoRefreshSecondsChange = useCallback((v: number) => {
    setAutoRefreshSeconds(v)
    setTimeRange(recentTimeRange)
  }, [])

  return (
    <div className={styles.container}>
      <Card>
        <Space size="middle">
          <InstanceSelect value={instanceId} onChange={setInstanceId} />
          <Button.Group>
            <TimeRangeSelector
              value={timeRange}
              onChange={handleSetTimeRange}
            />
            <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
          </Button.Group>
          <AutoRefreshButton
            autoRefreshSeconds={autoRefreshSeconds}
            onAutoRefreshSecondsChange={handleAutoRefreshSecondsChange}
            remainingRefreshSeconds={remainingRefreshSeconds}
            isLoading={isLoading}
            onRefresh={refreshTimestampRange}
            options={autoRefreshOptions}
          />
        </Space>
      </Card>
      <Spin spinning={isLoading}>
        {!isLoading && !seriesData?.length && (
          <p style={{ marginTop: '100px', textAlign: 'center' }}>
            {t('top_sql.no_data')}
          </p>
        )}
        <div className={styles.chart_container}>
          <ListChart
            onBrushEnd={handleBrushEnd}
            seriesData={seriesData}
            timeRange={timeRange}
            timestampRange={queryTimestampRange}
          />
        </div>
        {!!seriesData?.length && <ListTable data={seriesData} />}
      </Spin>
    </div>
  )
}

const queryTopSQLDigests = asyncDebounce(
  (
    instanceId: InstanceId,
    windowSize: number,
    timeRange: TimeRange,
    topN: string
  ) => {
    const [beginTs, endTs] = calcTimeRange(timeRange)
    return client
      .getInstance()
      .topsqlCpuTimeGet(
        endTs as any,
        instanceId,
        beginTs as any,
        topN,
        `${windowSize}s` as any
      )
      .then((data) => {
        const seriesData = data?.data.data
        if (seriesData) {
          // Sort data by digest
          // If this digest occurs continuously on the timeline, we can easily see the sequential overhead
          seriesData.sort(
            (a, b) => a.sql_digest?.localeCompare(b.sql_digest!) || 0
          )
          seriesData.forEach((d) => {
            convertOthersRecord(d)
            d.plans?.forEach(
              (item) =>
                (item.timestamp_secs = item.timestamp_secs?.map(
                  (t) => t * 1000
                ))
            )
          })
        }
        return {
          seriesData,
          queryTimestampRange: [beginTs * 1000, endTs * 1000] as [
            number,
            number
          ],
        }
      })
  },
  100,
  { leading: false }
)

function useSeriesData(
  instanceId: InstanceId,
  timeRange: TimeRange,
  autoRefreshSeconds: number,
  refreshTimestamp: number
) {
  const { windowSize } = useWindowSize()

  const { data, ...otherReturns } = useQuery(
    [
      'getSeriesData',
      instanceId,
      windowSize,
      timeRange.value,
      autoRefreshSeconds,
      refreshTimestamp,
    ],
    () => queryTopSQLDigests(instanceId, windowSize, timeRange, '5'),
    {
      enabled: !!instanceId,
      refetchInterval: !!autoRefreshSeconds && autoRefreshSeconds * 1000,
    }
  )

  return {
    seriesData: data?.seriesData || [],
    queryTimestampRange: data?.queryTimestampRange || [0, 0],
    ...otherReturns,
  }
}
