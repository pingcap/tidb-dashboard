import { timeFormatter, XYBrushArea, BrushEndListener } from '@elastic/charts'
import React, { useCallback, useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { Spin, Button, Space, Checkbox, Select } from 'antd'
import { ReloadOutlined, FullscreenOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

import '@elastic/charts/dist/theme_light.css'

import client from '@lib/client'
import { useLocalStorageState } from '@lib/utils/useLocalStorageState'
import { useURLQueryState } from '@lib/utils/useURLQueryState'
import { asyncDebounce } from '@lib/utils/asyncDebounce'
import { Card } from '@lib/components'
import {
  InstanceSelect,
  InstanceId,
  TimeRange,
  useTimeRange,
  getTimestampRange,
  TIME_RANGE_INTERVAL_MAP,
} from '../components/Filter'
import { TopSqlTable } from './TopSqlTable'
import styles from './TopSql.module.less'
import { convertOthersRecord } from './useOthers'
import { TopSqlChart } from './TopSqlChart'
import {
  useWindowSizeContext,
  useWindowSize,
  WindowSizeContext,
} from './useWindowSize'

const fullFormatter = timeFormatter('YYYY-MM-DD HH:mm:ss')

const DEFAULT_TOP_N = '5'
const topNSelects = ['5', '20']

export function TopSQL() {
  const windowSizeContext = useWindowSizeContext({ barWidth: 10 })
  return (
    <WindowSizeContext.Provider value={windowSizeContext}>
      <App />
    </WindowSizeContext.Provider>
  )
}

function App() {
  const { t } = useTranslation()
  const [chartTimeRange, setChartTimeRange] = useState<
    [number, number] | undefined
  >(undefined)
  const [autoRefresh, _setAutoRefresh] = useLocalStorageState(
    'topsql_auto_refresh',
    false
  )
  const [topN, setTopN] = useURLQueryState('topn', DEFAULT_TOP_N)
  const [instanceId, setInstanceId] = useURLQueryState('instance_id')
  const { timeRange, setTimeRange } = useTimeRange()
  const [refreshTimestamp, setRefreshTimestamp] = useState(0)
  const { seriesData, queryTimestampRange, isLoading } = useSeriesData(
    instanceId,
    timeRange,
    autoRefresh,
    topN,
    refreshTimestamp
  )

  const handleBrushEnd: BrushEndListener = useCallback((v: XYBrushArea) => {
    if (v.x) {
      setChartTimeRange(v.x)
    }
  }, [])

  const resetChartTimeRange = useCallback(() => {
    setChartTimeRange(undefined)
  }, [])

  const refreshTimestampRange = useCallback(() => {
    setRefreshTimestamp(Date.now())
  }, [])

  const setAutoRefresh = useCallback(() => {
    _setAutoRefresh((b) => !b)
    refreshTimestampRange()
  }, [refreshTimestampRange, _setAutoRefresh])

  useEffect(() => {
    resetChartTimeRange()
  }, [seriesData, resetChartTimeRange])

  return (
    <div className={styles.container}>
      <Card>
        <Space size="middle">
          <InstanceSelect value={instanceId} onChange={setInstanceId} />
          <TimeRange value={timeRange} onChange={setTimeRange} />
          <Select
            style={{ width: 140 }}
            placeholder="Top N"
            value={topN}
            onChange={(v) => setTopN(`${v}`)}
          >
            {topNSelects.map((s) => (
              <Select.Option value={s} key={s}>
                Top {s}
              </Select.Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={refreshTimestampRange} />
          <Button onClick={setAutoRefresh}>
            <Checkbox style={{ pointerEvents: 'none' }} checked={autoRefresh}>
              {t('top_sql.auto_refresh')}
            </Checkbox>
          </Button>
          {chartTimeRange && (
            <div>
              <Button
                icon={<FullscreenOutlined />}
                onClick={resetChartTimeRange}
              >
                Reset Time Range
              </Button>
              {` (now: ${fullFormatter(chartTimeRange[0])} ~ ${fullFormatter(
                chartTimeRange[1]
              )})`}
            </div>
          )}
        </Space>
      </Card>
      <Spin spinning={isLoading}>
        {!isLoading && !seriesData?.length && (
          <p style={{ marginTop: '100px', textAlign: 'center' }}>
            {t('top_sql.no_data')}
          </p>
        )}
        <div className={styles.chart_container}>
          <TopSqlChart
            onBrushEnd={handleBrushEnd}
            seriesData={seriesData}
            timeRange={timeRange}
            timestampRange={queryTimestampRange}
            chartTimeRange={chartTimeRange}
          />
        </div>
        {!!seriesData?.length && (
          <TopSqlTable
            topN={topN}
            data={seriesData}
            timeRange={chartTimeRange}
          />
        )}
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
    const [beginTs, endTs] = getTimestampRange(timeRange)
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
  autoRefresh: boolean,
  topN: string,
  refreshTimestamp: number
) {
  const { windowSize } = useWindowSize()
  const interval = TIME_RANGE_INTERVAL_MAP[timeRange.id]

  const { data, ...otherReturns } = useQuery(
    [
      'getSeriesData',
      instanceId,
      windowSize,
      timeRange.id,
      autoRefresh,
      topN,
      refreshTimestamp,
    ],
    () => queryTopSQLDigests(instanceId, windowSize, timeRange, topN),
    {
      enabled: !!instanceId,
      refetchInterval: autoRefresh && interval > 0 && interval * 1000,
    }
  )

  return {
    seriesData: data?.seriesData || [],
    queryTimestampRange: data?.queryTimestampRange || [0, 0],
    ...otherReturns,
  }
}
