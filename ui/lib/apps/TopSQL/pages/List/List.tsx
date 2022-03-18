import { XYBrushArea, BrushEndListener } from '@elastic/charts'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Space, Button, Spin, Alert, Tooltip, Drawer, Result } from 'antd'
import {
  ZoomOutOutlined,
  LoadingOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useSessionStorage } from 'react-use'

import '@elastic/charts/dist/theme_only_light.css'

import formatSql from '@lib/utils/sqlFormatter'
import client, { TopsqlInstanceItem, TopsqlSummaryItem } from '@lib/client'
import {
  Card,
  AutoRefreshButton,
  TimeRangeSelector,
  calcTimeRange,
  DEFAULT_TIME_RANGE,
  Toolbar,
} from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'

import { telemetry } from '../../utils/telemetry'
import { InstanceSelect } from '../../components/Filter'
import styles from './List.module.less'
import { ListTable } from './ListTable'
import { ListChart } from './ListChart'
import { createUseTimeWindowSize } from '../../utils/useTimeWindowSize'
import { SettingsForm } from './SettingsForm'
import { onLegendItemOver, onLegendItemOut } from './legendAction'
import { InstanceType } from './ListDetail/ListDetailTable'

const autoRefreshOptions = [30, 60, 2 * 60, 5 * 60, 10 * 60]
const zoomOutRate = 0.5
const useTimeWindowSize = createUseTimeWindowSize(8)
const topN = 5

export function TopSQLList() {
  const { t } = useTranslation()
  const { topSQLConfig, isConfigLoading, updateConfig, haveHistoryData } =
    useTopSQLConfig()
  const [showSettings, setShowSettings] = useState(false)
  const [remainingRefreshSeconds, setRemainingRefreshSeconds] = useState(0)
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useSessionStorage(
    'topsql.auto_refresh',
    0
  )
  const [instance, setInstance] = useSessionStorage<TopsqlInstanceItem>(
    'topsql.instance',
    null as any
  )
  const [timeRange, setTimeRange] = useSessionStorage(
    'topsql.recent_time_range',
    DEFAULT_TIME_RANGE
  )
  const { timeWindowSize, computeTimeWindowSize } = useTimeWindowSize()
  const {
    topSQLData,
    updateTopSQLData,
    isLoading: isDataLoading,
  } = useTopSQLData()
  const isLoading = isConfigLoading || isDataLoading
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [queryTimestampRange, setQueryTimestampRange] = useState<
    [number, number] | null
  >(null)
  const { instances, isLoading: isInstancesLoading } =
    useInstances(queryTimestampRange)

  useEffect(() => {
    setContainerWidth(containerRef.current?.offsetWidth || 0)
  }, [containerRef])

  // Calculate time window size by container width and time range.
  useEffect(() => {
    if (!containerWidth) {
      return
    }

    const timeRangeTimestamp = calcTimeRange(timeRange)
    const delta = timeRangeTimestamp[1] - timeRangeTimestamp[0]
    computeTimeWindowSize(containerWidth, delta)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth, timeRange])

  const handleUpdateTopSQLData = useCallback(() => {
    // Update container width when refresh, then trigger the update of time window size to refresh.
    const cw = containerRef.current?.offsetWidth || 0
    if (cw !== containerWidth) {
      setContainerWidth(containerRef.current?.offsetWidth || 0)
      return
    }

    const timestamps = calcTimeRange(timeRange)
    setQueryTimestampRange(timestamps)

    if (!instance || !timeWindowSize) {
      return
    }

    setRemainingRefreshSeconds(autoRefreshSeconds)
    updateTopSQLData({ instance, timestamps, timeWindowSize, topN })
  }, [
    instance,
    timeRange,
    timeWindowSize,
    autoRefreshSeconds,
    containerRef,
    containerWidth,
    updateTopSQLData,
  ])

  // fetch data when instance id / time window size update
  useEffect(() => {
    handleUpdateTopSQLData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, timeWindowSize])

  const handleBrushEnd: BrushEndListener = useCallback(
    (v: XYBrushArea) => {
      if (!v.x) {
        return
      }

      const tr = v.x.map((d) => d / 1000)
      const delta = tr[1] - tr[0]
      if (delta < 60) {
        const offset = Math.floor(delta / 2)
        const value: [number, number] = [
          Math.ceil(tr[0] + offset - 30),
          Math.floor(tr[1] - offset + 30),
        ]

        setTimeRange({
          type: 'absolute',
          value,
        })
        telemetry.dndZoomIn(value)
        return
      }

      const value: [number, number] = [Math.ceil(tr[0]), Math.floor(tr[1])]
      setTimeRange({
        type: 'absolute',
        value,
      })
      telemetry.dndZoomIn(value)
    },
    [setTimeRange]
  )

  const zoomOut = useCallback(() => {
    const [start, end] = calcTimeRange(timeRange)
    let expand = (end - start) * zoomOutRate
    if (expand < 300) {
      expand = 300
    }

    let computedStart = start - expand
    let computedEnd = end + expand
    const v: [number, number] = [computedStart, computedEnd]

    setTimeRange({ type: 'absolute', value: v })
    telemetry.clickZoomOut(v)
  }, [timeRange, setTimeRange])

  const chartRef = useRef<any>(null)

  return (
    <>
      <div className={styles.container} ref={containerRef}>
        {/* Show "not enabled" Alert when there are historical data */}
        {!isConfigLoading && !topSQLConfig?.enable && haveHistoryData && (
          <Card noMarginBottom>
            <Alert
              message={t(`topsql.alert_header.title`)}
              description={
                <>
                  {t(`topsql.alert_header.body`)}
                  <a
                    onClick={() => {
                      setShowSettings(true)
                      telemetry.clickSettings('bannerTips')
                    }}
                  >
                    {` ${t('topsql.alert_header.settings')}`}
                  </a>
                </>
              }
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
                onChange={(inst) => {
                  setInstance(inst)
                  if (inst) {
                    telemetry.finishSelectInstance(inst?.instance_type!)
                  }
                }}
                instances={instances}
                disabled={isLoading || isInstancesLoading}
                onDropdownVisibleChange={(open) =>
                  open && telemetry.openSelectInstance()
                }
              />
              <Button.Group>
                <TimeRangeSelector
                  value={timeRange}
                  onChange={(v) => {
                    setTimeRange(v)
                    telemetry.selectTimeRange(v)
                  }}
                  disabled={isLoading}
                  onVisibleChange={(visible) =>
                    visible && telemetry.openTimeRangePicker()
                  }
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
                onAutoRefreshSecondsChange={(sec) => {
                  setAutoRefreshSeconds(sec)
                  telemetry.selectAutoRefreshOption(sec)
                }}
                remainingRefreshSeconds={remainingRefreshSeconds}
                onRemainingRefreshSecondsChange={setRemainingRefreshSeconds}
                onRefresh={() => {
                  handleUpdateTopSQLData()
                  telemetry.clickAutoRefresh()
                }}
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
                <SettingOutlined
                  onClick={() => {
                    setShowSettings(true)
                    telemetry.clickSettings('settingIcon')
                  }}
                />
              </Tooltip>
            </Space>
          </Toolbar>
        </Card>

        {/* Show "not enabled" Result when there are no historical data */}
        {!isConfigLoading && !topSQLConfig?.enable && !haveHistoryData ? (
          <Result
            title={t('topsql.settings.disabled_result.title')}
            subTitle={t('topsql.settings.disabled_result.sub_title')}
            extra={
              <Button
                type="primary"
                onClick={() => {
                  setShowSettings(true)
                  telemetry.clickSettings('firstTimeTips')
                }}
              >
                {t('conprof.settings.open_settings')}
              </Button>
            }
          />
        ) : (
          <>
            <div className={styles.chart_container}>
              {!!queryTimestampRange && (
                <ListChart
                  onBrushEnd={handleBrushEnd}
                  data={topSQLData}
                  timeRangeTimestamp={queryTimestampRange}
                  timeWindowSize={timeWindowSize}
                  ref={chartRef}
                />
              )}
            </div>
            {!!topSQLData?.length && (
              <ListTable
                onRowOver={(key: string) =>
                  onLegendItemOver(chartRef.current, key)
                }
                onRowLeave={() => onLegendItemOut(chartRef.current)}
                topN={topN}
                instanceType={instance.instance_type as InstanceType}
                data={topSQLData}
              />
            )}
          </>
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

const useTopSQLData = () => {
  const [topSQLData, setTopSQLData] = useState<TopsqlSummaryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const updateTopSQLData = useCallback(
    async ({
      instance,
      timestamps,
      timeWindowSize,
      topN,
    }: {
      instance: TopsqlInstanceItem
      timestamps: [number, number]
      timeWindowSize: number
      topN: number
    }) => {
      let data: TopsqlSummaryItem[]
      const [start, end] = timestamps
      try {
        setIsLoading(true)
        const resp = await client
          .getInstance()
          .topsqlSummaryGet(
            String(end),
            instance.instance,
            instance.instance_type,
            String(start),
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
        d.sql_text = formatSql(d.sql_text)
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
    },
    []
  )

  return { topSQLData, updateTopSQLData, isLoading }
}

const useTopSQLConfig = () => {
  // Use the instance interface to query if historical data is available
  const {
    data: topSQLConfig,
    isLoading: isConfigLoading,
    sendRequest: updateConfig,
  } = useClientRequest((reqConfig) =>
    client.getInstance().topsqlConfigGet(reqConfig)
  )
  const [haveHistoryData, setHaveHistoryData] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    if (!topSQLConfig) {
      return
    }

    if (!!topSQLConfig.enable) {
      setLoadingHistory(false)
      return
    }

    ;(async function () {
      const now = Date.now() / 1000
      const sevenDaysAgo = now - 7 * 24 * 60 * 60

      setLoadingHistory(true)
      try {
        const res = await client
          .getInstance()
          .topsqlInstancesGet(String(now), String(sevenDaysAgo))
        const data = res.data.data
        if (!!data?.length) {
          setHaveHistoryData(true)
        } else {
          setHaveHistoryData(false)
        }
      } finally {
        setLoadingHistory(false)
      }
    })()
  }, [topSQLConfig])

  return {
    topSQLConfig,
    isConfigLoading: isConfigLoading || loadingHistory,
    updateConfig,
    haveHistoryData,
  }
}

const useInstances = (queryTimestampRange: [number, number] | null) => {
  const [instances, setInstances] = useState<TopsqlInstanceItem[]>([])
  const [isLoading, setLoading] = useState(false)
  const updateInstances = useCallback(async () => {
    if (!queryTimestampRange) {
      return
    }

    const [start, end] = queryTimestampRange

    setLoading(true)
    try {
      const resp = await client
        .getInstance()
        .topsqlInstancesGet(String(end), String(start))
      const instances = resp.data.data
      if (!instances) {
        return
      }
      setInstances(instances)
    } finally {
      setLoading(false)
    }
  }, [queryTimestampRange])

  useEffect(() => {
    updateInstances()
  }, [updateInstances])

  return {
    instances,
    isLoading,
  }
}
