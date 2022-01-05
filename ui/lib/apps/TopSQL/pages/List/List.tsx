import { XYBrushArea, BrushEndListener } from '@elastic/charts'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Space, Button, Spin, Alert, Tooltip, Drawer } from 'antd'
import {
  ZoomOutOutlined,
  LoadingOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

import '@elastic/charts/dist/theme_only_light.css'

import client, { TopsqlInstanceItem, TopsqlSummaryItem } from '@lib/client'
import { useLocalStorageState } from '@lib/utils/useLocalStorageState'
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

import { InstanceSelect } from '../../components/Filter'
import styles from './List.module.less'
import { ListTable } from './ListTable'
import { ListChart } from './ListChart'
import { createUseTimeWindowSize } from '../../utils/useTimeWindowSize'
import { SettingsForm } from './SettingsForm'
import { onLegendItemOver, onLegendItemOut } from './legendAction'

const autoRefreshOptions = [30, 60, 2 * 60, 5 * 60, 10 * 60]
const zoomOutRate = 0.5
const useTimeWindowSize = createUseTimeWindowSize(8)
const topN = 5

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
    'topsql.auto_refresh',
    0
  )
  const [instance, setInstance] = useLocalStorageState<TopsqlInstanceItem>(
    'topsql.instance',
    null as any
  )
  const [timeRange, setTimeRange] = useLocalStorageState(
    'topsql.recent_time_range',
    DEFAULT_TIME_RANGE
  )
  const { timeWindowSize, computeTimeWindowSize, isTimeWindowSizeComputed } =
    useTimeWindowSize()
  const {
    topSQLData,
    updateTopSQLData,
    isLoading: isDataLoading,
    queryTimestampRange,
  } = useTopSQLData({ instance, timeRange, timeWindowSize, topN })
  const isLoading = isConfigLoading || isDataLoading
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    setContainerWidth(containerRef.current?.offsetWidth || 0)
  }, [containerRef])

  // Calculate time window size by container width and time range
  useEffect(() => {
    if (!containerWidth) {
      return
    }

    const timeRangeTimestamp = calcTimeRange(timeRange)
    const delta = timeRangeTimestamp[1] - timeRangeTimestamp[0]
    computeTimeWindowSize(containerWidth, delta)
  }, [containerWidth, timeRange])

  const handleUpdateTopSQLData = useCallback(() => {
    const cw = containerRef.current?.offsetWidth || 0
    if (cw !== containerWidth) {
      setContainerWidth(containerRef.current?.offsetWidth || 0)
      return
    }
    setRemainingRefreshSeconds(autoRefreshSeconds)
    updateTopSQLData()
  }, [updateTopSQLData, autoRefreshSeconds, containerRef, containerWidth])

  // fetch data when instance id / time window size update
  useEffect(() => {
    if (!isTimeWindowSizeComputed) {
      return
    }
    handleUpdateTopSQLData()
  }, [instance, timeWindowSize, isTimeWindowSizeComputed])

  const handleBrushEnd: BrushEndListener = useCallback((v: XYBrushArea) => {
    if (!v.x) {
      return
    }

    const tr = v.x.map((d) => d / 1000)
    if (tr[1] - tr[0] < 60) {
      return
    }

    setTimeRange({
      type: 'absolute',
      value: [Math.ceil(tr[0]), Math.floor(tr[1])],
    })
  }, [])

  const zoomOut = useCallback(() => {
    const [start, end] = calcTimeRange(timeRange)
    let expand = (end - start) * zoomOutRate
    if (expand < 300) {
      expand = 300
    }

    let computedStart = start - expand
    let computedEnd = end + expand

    setTimeRange({ type: 'absolute', value: [computedStart, computedEnd] })
  }, [timeRange])

  const chartRef = useRef<any>(null)

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
                value={instance}
                onChange={setInstance}
                disabled={isLoading}
                timeRange={timeRange}
              />
              <Button.Group>
                <TimeRangeSelector
                  value={timeRange}
                  onChange={setTimeRange}
                  disabled={isLoading}
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
                onAutoRefreshSecondsChange={setAutoRefreshSeconds}
                remainingRefreshSeconds={remainingRefreshSeconds}
                onRemainingRefreshSecondsChange={setRemainingRefreshSeconds}
                onRefresh={handleUpdateTopSQLData}
                autoRefreshSecondsOptions={autoRefreshOptions}
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
            ref={chartRef}
          />
        </div>
        {!!topSQLData?.length && (
          <ListTable
            onRowOver={(key: string) => onLegendItemOver(chartRef.current, key)}
            onRowLeave={() => onLegendItemOut(chartRef.current)}
            topN={topN}
            data={topSQLData}
          />
        )}
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

const useTopSQLData = ({
  instance,
  timeRange,
  timeWindowSize,
  topN,
}: {
  instance?: TopsqlInstanceItem
  timeRange: TimeRange
  timeWindowSize: number
  topN: number
}) => {
  const [topSQLData, setTopSQLData] = useState<TopsqlSummaryItem[]>([])
  const [queryTimestampRange, setQueryTimestampRange] = useState(
    calcTimeRange(timeRange)
  )
  const [isLoading, setIsLoading] = useState(false)
  const updateTopSQLData = useCallback(async () => {
    if (!instance) {
      return
    }

    const [beginTs, endTs] = calcTimeRange(timeRange)
    let data: TopsqlSummaryItem[]
    try {
      setIsLoading(true)
      const resp = await client
        .getInstance()
        .topsqlSummaryGet(
          endTs as any,
          instance.instance,
          instance.instance_type,
          beginTs as any,
          String(topN),
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
      d.plans?.forEach((item) => {
        // Filter empty cpu time data
        item.timestamp_sec = item.timestamp_sec?.filter(
          (_, index) => !!item.cpu_time_ms?.[index]
        )
        item.cpu_time_ms = item.cpu_time_ms?.filter((c) => !!c)

        item.timestamp_sec = item.timestamp_sec?.map((t) => t * 1000)
      })
    })

    setTopSQLData(data)
    setQueryTimestampRange([beginTs, endTs])
  }, [instance, timeWindowSize, timeRange, topN])

  return { topSQLData, updateTopSQLData, isLoading, queryTimestampRange }
}
