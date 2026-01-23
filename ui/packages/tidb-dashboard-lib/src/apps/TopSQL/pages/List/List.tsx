import { BrushEndListener, BrushEvent } from '@elastic/charts'
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo
} from 'react'
import {
  Select,
  Space,
  Button,
  Spin,
  Alert,
  Tooltip,
  Drawer,
  Result
} from 'antd'
import {
  LoadingOutlined,
  QuestionCircleOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMount, useSessionStorage } from 'react-use'
import { useMemoizedFn } from 'ahooks'
import { sortBy } from 'lodash'
import formatSql from '@lib/utils/sqlFormatter'
import {
  TopsqlInstanceItem,
  TopsqlSummaryByItem,
  TopsqlSummaryItem,
  TopsqlSummaryResponse
} from '@lib/client'
import {
  Card,
  toTimeRangeValue as _toTimeRangeValue,
  Toolbar,
  AutoRefreshButton,
  TimeRange,
  fromTimeRangeValue,
  TimeRangeValue,
  LimitTimeRange
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
import { isDistro } from '@lib/utils/distro'
import { TopSQLContext } from '../../context'
import { useURLTimeRange } from '@lib/hooks/useURLTimeRange'
import { useQueryParams } from '@lib/hooks/useQueryParams'

const { Option } = Select
const CHART_BAR_WIDTH = 8
const RECENT_RANGE_OFFSET = -60
const LIMITS = [5, 20, 100]

export enum AggLevel {
  Query = 'query',
  Table = 'table',
  Schema = 'db',
  Region = 'region'
}

export enum OrderBy {
  CpuTime = 'cpu',
  NetworkBytes = 'network',
  LogicalIoBytes = 'logical_io'
}

const formatLabel = (item: AggLevel): string => {
  if (item === AggLevel.Schema) return 'DB' // Special case for 'db'
  return item.charAt(0).toUpperCase() + item.slice(1) // Capitalize first letter
}

const formatOrderByLabel = (item: OrderBy): string => {
  const labels: Record<OrderBy, string> = {
    [OrderBy.CpuTime]: 'CPU',
    [OrderBy.NetworkBytes]: 'Network',
    [OrderBy.LogicalIoBytes]: 'Logical IO'
  }
  return labels[item] || item
}

const GROUP = [AggLevel.Query, AggLevel.Table, AggLevel.Schema, AggLevel.Region]

const toTimeRangeValue: typeof _toTimeRangeValue = (v) => {
  return _toTimeRangeValue(v, v?.type === 'recent' ? RECENT_RANGE_OFFSET : 0)
}

export function TopSQLList() {
  const ctx = useContext(TopSQLContext)
  const { t } = useTranslation()
  const { topSQLConfig, isConfigLoading, updateConfig, haveHistoryData } =
    useTopSQLConfig()
  const [showSettings, setShowSettings] = useState(false)
  const [instance, setInstance] = useSessionStorage<TopsqlInstanceItem | null>(
    'topsql.instance',
    null
  )
  const { queryParams, setQueryParams } = useQueryParams<{
    instance: string
  }>({
    instance: ''
  })
  const { timeRange, setTimeRange } = useURLTimeRange()
  const [limit, setLimit] = useState(5)
  const [groupBy, setGroupBy] = useState(AggLevel.Query)
  const [orderBy, setOrderBy] = useState(OrderBy.CpuTime)
  const [timeWindowSize, setTimeWindowSize] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const computeTimeWindowSize = useMemoizedFn(
    ([min, max]: TimeRangeValue): number => {
      const screenWidth = containerRef.current?.offsetWidth || 0
      const windowSize = Math.ceil(
        (CHART_BAR_WIDTH * (max - min)) / screenWidth
      )
      const finalWindowSize =
        ctx?.cfg.minWindowInterval !== undefined
          ? Math.max(windowSize, ctx.cfg.minWindowInterval)
          : windowSize
      setTimeWindowSize(finalWindowSize)
      return finalWindowSize
    }
  )
  const {
    topSQLData,
    isLoading: isDataLoading,
    updateTopSQLData
  } = useTopSQLData(
    instance,
    timeRange,
    limit,
    groupBy,
    orderBy,
    computeTimeWindowSize
  )
  const isLoading = isConfigLoading || isDataLoading
  const {
    instances,
    isLoading: isInstancesLoading,
    fetchInstances
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
          Math.floor(tr[1] - offset + 30)
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
    const instances = await fetchInstances(timeRange)
    const instanceFromURL = queryParams.instance

    if (instanceFromURL) {
      const instance = instances.find(
        (instance) => instance.instance === instanceFromURL
      )
      if (instance) {
        setInstance(instance)
        return
      }
    }

    // Select the first instance if there not instance selected
    if (!!instance) {
      return
    }
    setInstance(instances[0])
  })

  useMount(() => {
    fetchInstancesAndSelectInstance()
  })

  const chartRef = useRef<any>(null)

  // only for clinic
  const clusterInfo = useMemo(() => {
    const infos: string[] = []
    if (ctx?.cfg.orgName) {
      infos.push(`Org: ${ctx?.cfg.orgName}`)
    }
    if (ctx?.cfg.clusterName) {
      infos.push(`Cluster: ${ctx?.cfg.clusterName}`)
    }
    return infos.join(' | ')
  }, [ctx?.cfg.orgName, ctx?.cfg.clusterName])

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
          {clusterInfo && (
            <div style={{ marginBottom: 8, textAlign: 'right' }}>
              {clusterInfo}
            </div>
          )}

          <Toolbar>
            <Space>
              <InstanceSelect
                value={instance}
                onChange={(inst) => {
                  setInstance(inst)
                  if (!!inst?.instance) {
                    setQueryParams({ instance: inst.instance })
                  }
                  if (inst) {
                    telemetry.finishSelectInstance(inst?.instance_type!)
                  }
                  // only group by sql when instance is not tikv
                  if (inst?.instance_type !== 'tikv') {
                    setGroupBy(AggLevel.Query)
                  }
                  // Reset orderBy if current selection is not supported by new instance type
                  if (
                    inst?.instance_type !== 'tikv' &&
                    orderBy === OrderBy.LogicalIoBytes
                  ) {
                    setOrderBy(OrderBy.CpuTime)
                  }
                }}
                instances={instances}
                disabled={isLoading || isInstancesLoading}
                onDropdownVisibleChange={(open) =>
                  open && telemetry.openSelectInstance()
                }
              />
              <LimitTimeRange
                value={timeRange}
                recent_seconds={ctx?.cfg.timeRangeSelector?.recentSeconds}
                customAbsoluteRangePicker={
                  ctx?.cfg.timeRangeSelector?.customAbsoluteRangePicker
                }
                timeRangeLimit={ctx?.cfg.timeRangeSelector?.timeRangeLimit}
                onChange={(v) => {
                  setTimeRange(v)
                  telemetry.selectTimeRange(v)
                }}
                onZoomOutClick={(start, end) =>
                  telemetry.clickZoomOut([start, end])
                }
                disabled={isLoading}
              />
              {ctx?.cfg.showLimit && (
                <Select
                  style={{ width: 150 }}
                  value={limit}
                  onChange={setLimit}
                  data-e2e="limit_select"
                >
                  {LIMITS.map((item) => (
                    <Option value={item} key={item} data-e2e="limit_option">
                      Limit {item}
                    </Option>
                  ))}
                </Select>
              )}
              {ctx?.cfg.showGroupBy && instance?.instance_type === 'tikv' && (
                <Select
                  style={{ width: 150 }}
                  value={groupBy}
                  onChange={setGroupBy}
                  data-e2e="group_select"
                >
                  {GROUP.filter((item) => {
                    // Only show Region option when showGroupByRegion is true
                    // (instance?.instance_type === 'tikv' is already checked in outer condition)
                    if (item === AggLevel.Region) {
                      return ctx?.cfg.showGroupByRegion === true
                    }
                    return true
                  }).map((item) => (
                    <Option value={item} key={item} data-e2e="group_option">
                      By {formatLabel(item)}
                    </Option>
                  ))}
                </Select>
              )}
              {ctx?.cfg.showOrderBy && instance && (
                <Select
                  style={{ width: 150 }}
                  value={orderBy}
                  onChange={setOrderBy}
                  data-e2e="order_by_select"
                >
                  <Option
                    value={OrderBy.CpuTime}
                    key={OrderBy.CpuTime}
                    data-e2e="order_by_option_cpu_time"
                  >
                    Order By {formatOrderByLabel(OrderBy.CpuTime)}
                  </Option>
                  <Option
                    value={OrderBy.NetworkBytes}
                    key={OrderBy.NetworkBytes}
                    data-e2e="order_by_option_network_bytes"
                  >
                    Order By {formatOrderByLabel(OrderBy.NetworkBytes)}
                  </Option>
                  {instance.instance_type === 'tikv' && (
                    <Option
                      value={OrderBy.LogicalIoBytes}
                      key={OrderBy.LogicalIoBytes}
                      data-e2e="order_by_option_logical_io_bytes"
                    >
                      Order By {formatOrderByLabel(OrderBy.LogicalIoBytes)}
                    </Option>
                  )}
                </Select>
              )}

              <AutoRefreshButton
                defaultValue={ctx?.cfg.autoRefresh === false ? 0 : undefined}
                disabled={isLoading}
                onRefresh={async () => {
                  await fetchInstancesAndSelectInstance()
                  updateTopSQLData(instance, timeRange, limit)
                }}
              />
              {isLoading && (
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
                />
              )}
            </Space>

            <Space>
              {ctx?.cfg.showSetting && (
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
              )}
              {!isDistro() && (
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
                {!isDistro() && (
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
                groupBy={groupBy}
                orderBy={orderBy}
                timeRangeTimestamp={toTimeRangeValue(timeRange)}
                timeWindowSize={timeWindowSize}
                ref={chartRef}
              />
            </div>
            {Boolean(topSQLData?.length) && (
              <ListTable
                onRowOver={(key: string) =>
                  onLegendItemOver(chartRef.current, key)
                }
                onRowLeave={() => onLegendItemOut(chartRef.current)}
                topN={limit}
                instanceType={instance?.instance_type as InstanceType}
                data={topSQLData}
                groupBy={groupBy}
                orderBy={orderBy}
                timeRange={timeRange}
              />
            )}
            {Boolean(!topSQLData?.length && timeRange.type === 'recent') && (
              <Card noMarginBottom noMarginTop>
                <p className="ant-form-item-extra">
                  {t('topsql.table.description_no_recent_data')}
                </p>
              </Card>
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
  limit: number,
  groupBy: string,
  orderBy: OrderBy,
  computeTimeWindowSize: (ts: TimeRangeValue) => number
) => {
  const ctx = useContext(TopSQLContext)

  const [topSQLData, setTopSQLData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const updateTopSQLData = useMemoizedFn(
    async (
      _instance: TopsqlInstanceItem | null,
      _timeRange: TimeRange,
      _limit: number | 5
    ) => {
      if (!_instance) {
        return
      }

      let dataResp: TopsqlSummaryResponse
      const ts = toTimeRangeValue(_timeRange)
      const timeWindowSize = computeTimeWindowSize(ts)

      const [start, end] = ts
      try {
        setIsLoading(true)
        const resp = await ctx!.ds.topsqlSummaryGet(
          String(end),
          ctx?.cfg.showGroupBy === true
            ? _instance.instance_type === 'tidb'
              ? AggLevel.Query
              : groupBy
            : undefined,
          _instance.instance,
          _instance.instance_type,
          ctx?.cfg.showOrderBy === true ? orderBy : undefined,
          String(start),
          String(limit),
          `${timeWindowSize}s`,
          ctx?.cfg.dataSource
        )
        dataResp = resp.data
      } finally {
        setIsLoading(false)
      }

      if (groupBy === AggLevel.Query || instance?.instance_type === 'tidb') {
        // Sort data by digest
        let data: TopsqlSummaryItem[] = dataResp.data ?? []
        // If this digest occurs continuously on the timeline, we can easily see the sequential overhead
        data.sort((a, b) => a.sql_digest?.localeCompare(b.sql_digest!) || 0)

        data.forEach((d) => {
          d.sql_text = formatSql(d.sql_text)
          d.plans?.forEach((item) => {
            // Filter data based on orderBy dimension
            let filterFn: (index: number) => boolean
            switch (orderBy) {
              case OrderBy.NetworkBytes:
                filterFn = (index: number) => !!item.network_bytes?.[index]
                break
              case OrderBy.LogicalIoBytes:
                filterFn = (index: number) => !!item.logical_io_bytes?.[index]
                break
              case OrderBy.CpuTime:
              default:
                filterFn = (index: number) => !!item.cpu_time_ms?.[index]
                break
            }
            item.timestamp_sec = item.timestamp_sec?.filter((_, index) =>
              filterFn(index)
            )
            // Filter the corresponding data arrays
            if (item.cpu_time_ms) {
              item.cpu_time_ms = item.cpu_time_ms.filter((_, index) =>
                filterFn(index)
              )
            }
            if (item.network_bytes) {
              item.network_bytes = item.network_bytes.filter((_, index) =>
                filterFn(index)
              )
            }
            if (item.logical_io_bytes) {
              item.logical_io_bytes = item.logical_io_bytes.filter((_, index) =>
                filterFn(index)
              )
            }

            item.timestamp_sec = item.timestamp_sec?.map((t) => t * 1000)
          })
        })
        setTopSQLData(data)
      }

      if (
        groupBy === AggLevel.Table ||
        groupBy === AggLevel.Schema ||
        groupBy === AggLevel.Region
      ) {
        let data: TopsqlSummaryByItem[] = dataResp.data_by ?? []
        // Sort data by table
        // If this table occurs continuously on the timeline, we can easily see the sequential overhead
        // data.sort((a, b) => a.table_?.localeCompare(b.table!) || 0)
        data.forEach((d) => {
          // Filter data based on orderBy dimension
          // Note: TopsqlSummaryByItem may have network_bytes and logical_io_bytes arrays
          // but they're not in the type definition, so we use type assertion
          const byItem = d as any
          let filterFn: (index: number) => boolean
          switch (orderBy) {
            case OrderBy.NetworkBytes:
              filterFn = (index: number) => !!byItem.network_bytes?.[index]
              break
            case OrderBy.LogicalIoBytes:
              filterFn = (index: number) => !!byItem.logical_io_bytes?.[index]
              break
            case OrderBy.CpuTime:
            default:
              filterFn = (index: number) => !!d.cpu_time_ms?.[index]
              break
          }
          d.timestamp_sec = d.timestamp_sec?.filter((_, index) =>
            filterFn(index)
          )
          // Filter the corresponding data arrays
          if (d.cpu_time_ms) {
            d.cpu_time_ms = d.cpu_time_ms.filter((_, index) => filterFn(index))
          }
          if (byItem.network_bytes) {
            byItem.network_bytes = byItem.network_bytes.filter((_, index) =>
              filterFn(index)
            )
          }
          if (byItem.logical_io_bytes) {
            byItem.logical_io_bytes = byItem.logical_io_bytes.filter(
              (_, index) => filterFn(index)
            )
          }

          d.timestamp_sec = d.timestamp_sec?.map((t) => t * 1000)
        })
        setTopSQLData(data)
      }
    }
  )

  useEffect(() => {
    updateTopSQLData(instance, timeRange, limit)
  }, [instance, timeRange, limit, groupBy, orderBy, updateTopSQLData])

  return { topSQLData, isLoading, updateTopSQLData }
}

const useTopSQLConfig = () => {
  const ctx = useContext(TopSQLContext)
  // Use the instance interface to query if historical data is available
  const {
    data: topSQLConfig,
    isLoading: isConfigLoading,
    sendRequest: updateConfig
  } = useClientRequest(ctx!.ds.topsqlConfigGet)
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
        const res = await ctx!.ds.topsqlInstancesGet(
          String(now),
          String(sevenDaysAgo)
        )
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
  }, [topSQLConfig, ctx])

  return {
    topSQLConfig,
    isConfigLoading: isConfigLoading || loadingHistory,
    updateConfig,
    haveHistoryData
  }
}

const useInstances = (timeRange: TimeRange) => {
  const ctx = useContext(TopSQLContext)

  const [instances, setInstances] = useState<TopsqlInstanceItem[]>([])
  const [isLoading, setLoading] = useState(false)

  const fetchInstances = useCallback(
    async (_timeRange: TimeRange | null) => {
      if (!_timeRange) {
        return []
      }

      const [start, end] = toTimeRangeValue(_timeRange)
      const resp = await ctx!.ds.topsqlInstancesGet(String(end), String(start))
      // Deduplicate by instance and instance_type combination
      const instanceMap = new Map<string, TopsqlInstanceItem>()
      ;(resp.data.data || []).forEach((item) => {
        const key = `${item.instance}_${item.instance_type}`
        if (item.instance && item.instance_type && !instanceMap.has(key)) {
          instanceMap.set(key, item)
        }
      })
      const data = sortBy(Array.from(instanceMap.values()), [
        'instance_type',
        'instance'
      ])

      setInstances(data)
      return data
    },
    [ctx]
  )

  useEffect(() => {
    setLoading(true)
    fetchInstances(timeRange).finally(() => {
      setLoading(false)
    })
  }, [timeRange, fetchInstances])

  return {
    instances,
    fetchInstances,
    isLoading
  }
}
