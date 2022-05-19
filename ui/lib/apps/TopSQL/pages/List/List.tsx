import { BrushEndListener, BrushEvent } from '@elastic/charts'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Space, Button, Spin, Alert, Tooltip, Drawer, Result } from 'antd'
import {
  LoadingOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMount, useSessionStorage } from 'react-use'
import { useMemoizedFn } from 'ahooks'
import { sortBy } from 'lodash'
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
  fromTimeRangeValue,
  TimeRangeValue,
} from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'

import { telemetry } from '../../utils/telemetry'
import { InstanceSelect } from '../../components/Filter'
import styles from './List.module.less'
import { ListTable } from './ListTable'
import { ListChart } from './ListChart'
import { SettingsForm } from './SettingsForm'
import { onLegendItemOver, onLegendItemOut } from './legendAction'
import { InstanceType } from './ListDetail/ListDetailTable'
import { isDistro } from '@lib/utils/distroStringsRes'

const TOP_N = 5
const CHART_BAR_WIDTH = 8

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
  const [timeWindowSize, setTimeWindowSize] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const computeTimeWindowSize = useMemoizedFn(
    ([min, max]: TimeRangeValue): number => {
      const screenWidth = containerRef.current?.offsetWidth || 0
      const windowSize = Math.ceil(
        (CHART_BAR_WIDTH * (max - min)) / screenWidth
      )
      setTimeWindowSize(windowSize)
      return windowSize
    }
  )
  const {
    topSQLData,
    isLoading: isDataLoading,
    updateTopSQLData,
  } = useTopSQLData(instance, timeRange, computeTimeWindowSize)
  const isLoading = isConfigLoading || isDataLoading
  const {
    instances,
    isLoading: isInstancesLoading,
    fetchInstances,
  } = useInstances(timeRange)

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

      setTimeRange(fromTimeRangeValue(value))
      telemetry.dndZoomIn(value)
    },
    [setTimeRange]
  )

  const fetchInstancesAndSelectInstance = useMemoizedFn(async () => {
    const [firstInstance] = await fetchInstances(timeRange)

    // Select the first instance if there not instance selected
    if (!!instance) {
      return
    }
    setInstance(firstInstance)
  })

  useMount(() => {
    fetchInstancesAndSelectInstance()
  })

  const chartRef = useRef<any>(null)

  return (
    <>
      <div className={styles.container} ref={containerRef}>
        {/* Show "not enabled" Alert when there are historical data */}
        {!isConfigLoading && !topSQLConfig?.enable && haveHistoryData && (
          <Card noMarginBottom>
            <Alert
              data-e2e="topsql_not_enabled_alert"
              message={t(`topsql.alert_header.title`)}
              description={
                <>
                  {t(`topsql.alert_header.body`)}
                  {` `}
                  <a
                    onClick={() => {
                      setShowSettings(true)
                      telemetry.clickSettings('bannerTips')
                    }}
                  >
                    {t('topsql.alert_header.settings')}
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
              <TimeRangeSelector.WithZoomOut
                value={timeRange}
                onChange={(v) => {
                  setTimeRange(v)
                  telemetry.selectTimeRange(v)
                }}
                disabled={isLoading}
              />
              <AutoRefreshButton
                disabled={isLoading}
                onRefresh={async () => {
                  await fetchInstancesAndSelectInstance()
                  updateTopSQLData(instance, timeRange)
                }}
              />
              {isLoading && (
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
                />
              )}
            </Space>

            <Space>
              <Tooltip
                mouseEnterDelay={0}
                mouseLeaveDelay={0}
                title={t('topsql.settings.title')}
                placement="bottom"
              >
                <SettingOutlined
                  data-e2e="topsql_settings"
                  onClick={() => {
                    setShowSettings(true)
                    telemetry.clickSettings('settingIcon')
                  }}
                />
              </Tooltip>
              {!isDistro && (
                <Tooltip
                  mouseEnterDelay={0}
                  mouseLeaveDelay={0}
                  title={t('topsql.settings.help')}
                  placement="bottom"
                >
                  <QuestionCircleOutlined
                    onClick={() => {
                      window.open(t('topsql.settings.help_url'), '_blank')
                    }}
                  />
                </Tooltip>
              )}
            </Space>
          </Toolbar>
        </Card>

        {/* Show "not enabled" Result when there are no historical data */}
        {!isConfigLoading && !topSQLConfig?.enable && !haveHistoryData ? (
          <Result
            title={t('topsql.settings.disabled_result.title')}
            subTitle={t('topsql.settings.disabled_result.sub_title')}
            extra={
              <Space>
                <Button
                  type="primary"
                  onClick={() => {
                    setShowSettings(true)
                    telemetry.clickSettings('firstTimeTips')
                  }}
                >
                  {t('topsql.settings.open_settings')}
                </Button>
                {!isDistro && (
                  <Button
                    onClick={() => {
                      window.open(t('topsql.settings.help_url'), '_blank')
                    }}
                  >
                    {t('topsql.settings.help')}
                  </Button>
                )}
              </Space>
            }
          />
        ) : (
          <>
            <div
              className={styles.chart_container}
              data-e2e="topsql_list_chart"
            >
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
                topN={TOP_N}
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

const useTopSQLData = (
  instance: TopsqlInstanceItem | null,
  timeRange: TimeRange,
  computeTimeWindowSize: (ts: TimeRangeValue) => number
) => {
  const [topSQLData, setTopSQLData] = useState<TopsqlSummaryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const updateTopSQLData = useMemoizedFn(
    async (_instance: TopsqlInstanceItem | null, _timeRange: TimeRange) => {
      if (!_instance) {
        return
      }

      let data: TopsqlSummaryItem[]
      const ts = toTimeRangeValue(_timeRange)
      const timeWindowSize = computeTimeWindowSize(ts)

      const [start, end] = ts
      try {
        setIsLoading(true)
        const resp = await client
          .getInstance()
          .topsqlSummaryGet(
            String(end),
            _instance.instance,
            _instance.instance_type,
            String(start),
            String(TOP_N),
            `${timeWindowSize}s`
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
    }
  )

  useEffect(() => {
    updateTopSQLData(instance, timeRange)
  }, [instance, timeRange, updateTopSQLData])

  return { topSQLData, isLoading, updateTopSQLData }
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

const useInstances = (timeRange: TimeRange) => {
  const [instances, setInstances] = useState<TopsqlInstanceItem[]>([])
  const [isLoading, setLoading] = useState(false)

  const fetchInstances = async (
    _timeRange: TimeRange | null
  ): Promise<TopsqlInstanceItem[]> => {
    if (!_timeRange) {
      return []
    }

    const [start, end] = toTimeRangeValue(_timeRange)
    const resp = await client
      .getInstance()
      .topsqlInstancesGet(String(end), String(start))
    const data = sortBy(resp.data.data || [], ['instance_type', 'instance'])

    setInstances(data)
    return data
  }

  useEffect(() => {
    setLoading(true)
    fetchInstances(timeRange).finally(() => {
      setLoading(false)
    })
  }, [timeRange])

  return {
    instances,
    fetchInstances,
    isLoading,
  }
}
