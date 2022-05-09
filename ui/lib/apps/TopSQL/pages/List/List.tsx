import { BrushEndListener, BrushEvent } from '@elastic/charts'
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { Space, Button, Spin, Alert, Tooltip, Drawer, Result } from 'antd'
import { LoadingOutlined, SettingOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMount, useSessionStorage } from 'react-use'
import formatSql from '@lib/utils/sqlFormatter'
import client, { TopsqlInstanceItem, TopsqlSummaryItem } from '@lib/client'
import {
  Card,
  TimeRangeSelector,
  toTimeRangeValue,
  DEFAULT_TIME_RANGE,
  Toolbar,
  AutoRefreshButton,
  TimeRange,
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

const useTimeWindowSize = createUseTimeWindowSize(8)
const topN = 5

export function TopSQLList() {
  const { t } = useTranslation()
  const { topSQLConfig, isConfigLoading, updateConfig, haveHistoryData } =
    useTopSQLConfig()
  const [showSettings, setShowSettings] = useState(false)
  const [instance, setInstance] = useSessionStorage<TopsqlInstanceItem | null>(
    'topsql.instance',
    null
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
  const {
    instances,
    isLoading: isInstancesLoading,
    updateInstances,
  } = useInstances()

  const updateData = useCallback(
    (_instance: TopsqlInstanceItem | null, _timeRange: TimeRange) => {
      if (!_instance) {
        return
      }

      // Update container width when refresh, then trigger the update of time window size to refresh.
      const cw = containerRef.current?.offsetWidth || containerWidth
      if (cw !== containerWidth) {
        setContainerWidth(containerRef.current?.offsetWidth || 0)
      }

      const timestamps = toTimeRangeValue(_timeRange)
      const _timeWindowSize = computeTimeWindowSize(cw, timestamps)

      updateInstances(_timeRange)
      updateTopSQLData({
        instance: _instance,
        timestamps,
        timeWindowSize: _timeWindowSize,
        topN,
      })
    },
    [
      containerRef,
      containerWidth,
      updateTopSQLData,
      computeTimeWindowSize,
      updateInstances,
    ]
  )

  const handleBrushEnd: BrushEndListener = useCallback(
    (v: BrushEvent) => {
      if (!v.x) {
        return
      }

      let value: [number, number]
      const tr = v.x.map((d) => d / 1000)
      const delta = tr[1] - tr[0]
      if (delta < 60) {
        const offset = Math.floor(delta / 2)
        value = [
          Math.ceil(tr[0] + offset - 30),
          Math.floor(tr[1] - offset + 30),
        ]
      } else {
        value = [Math.ceil(tr[0]), Math.floor(tr[1])]
      }

      const _timeRange: TimeRange = {
        type: 'absolute',
        value,
      }

      setTimeRange(_timeRange)
      updateData(instance, _timeRange)
      telemetry.dndZoomIn(value)
    },
    [setTimeRange, updateData, instance]
  )

  useLayoutEffect(() => {
    setContainerWidth(containerRef.current?.offsetWidth || 0)
  }, [containerRef])

  useMount(async () => {
    let _instance: TopsqlInstanceItem | null = instance

    const _instances = await updateInstances(timeRange)
    if (!_instance) {
      _instance = _instances[0]
      setInstance(_instance)
    }
    updateData(_instance, timeRange)
  })

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
                  updateData(inst, timeRange)
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
              <TimeRangeSelector.WithZoomOut
                value={timeRange}
                onChange={(v) => {
                  setTimeRange(v)
                  updateData(instance, v)
                  telemetry.selectTimeRange(v)
                }}
                disabled={isLoading}
              />
              <AutoRefreshButton
                disabled={isLoading}
                onRefresh={() => updateData(instance, timeRange)}
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
              <ListChart
                onBrushEnd={handleBrushEnd}
                data={topSQLData}
                timeRangeTimestamp={toTimeRangeValue(timeRange)}
                timeWindowSize={timeWindowSize}
                ref={chartRef}
              />
            </div>
            {!!topSQLData?.length && (
              <ListTable
                onRowOver={(key: string) =>
                  onLegendItemOver(chartRef.current, key)
                }
                onRowLeave={() => onLegendItemOut(chartRef.current)}
                topN={topN}
                instanceType={instance?.instance_type as InstanceType}
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

const useInstances = () => {
  const [instances, setInstances] = useState<TopsqlInstanceItem[]>([])
  const [isLoading, setLoading] = useState(false)
  const updateInstances = useCallback(
    async (timeRange: TimeRange | null): Promise<TopsqlInstanceItem[]> => {
      if (!timeRange) {
        return []
      }

      const [start, end] = toTimeRangeValue(timeRange)

      setLoading(true)
      try {
        const resp = await client
          .getInstance()
          .topsqlInstancesGet(String(end), String(start))
        const instances = resp.data.data || []
        instances.sort((a, b) => {
          const localCompare = a.instance_type!.localeCompare(b.instance_type!)
          if (localCompare === 0) {
            return a.instance!.localeCompare(b.instance!)
          }
          return localCompare
        })
        setInstances(instances)
        return instances
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    instances,
    isLoading,
    updateInstances,
  }
}
