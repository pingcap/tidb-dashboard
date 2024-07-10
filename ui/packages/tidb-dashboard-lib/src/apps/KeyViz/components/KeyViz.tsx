import React, { useContext, useState } from 'react'
import { Button, Drawer, Result, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { useGetSet, useMount } from 'react-use'
import { useBoolean, useMemoizedFn } from 'ahooks'

import { ConfigKeyVisualConfig } from '@lib/client'
import { Heatmap } from '../heatmap'
import { HeatmapData, HeatmapRange, DataTag } from '../heatmap/types'
import { fetchHeatmap } from '../utils'
import KeyVizSettingForm from './KeyVizSettingForm'
import KeyVizToolbar from './KeyVizToolbar'

import './KeyViz.less'
import { useChange } from '@lib/utils/useChange'
import { isDistro } from '@lib/utils/distro'
import { IKeyVizDataSource, KeyVizContext } from '../context'

// const CACHE_EXPRIE_SECS = 10

class HeatmapCache {
  // cache: CacheEntry[] = []
  // latestFetchIdx = 0

  async fetch(
    fetcher: IKeyVizDataSource['keyvisualHeatmapsGet'],
    range: number | HeatmapRange,
    metricType: DataTag
  ): Promise<HeatmapData | undefined> {
    // return fetchDummyHeatmap()
    let selection
    if (typeof range === 'number') {
      const endTime = Math.ceil(new Date().getTime() / 1000)
      // this.cache = this.cache.filter((entry) => entry.expireTime > endTime)
      // const entry = this.cache.find(
      //   (entry) => entry.dateRange === range && entry.metricType === metricType
      // )
      // if (entry) {
      //   return entry.data
      // } else {
      selection = {
        starttime: endTime - range,
        endtime: endTime
      }
      // }
    } else {
      selection = range
    }

    // this.latestFetchIdx += 1
    // const fetchIdx = this.latestFetchIdx
    const data = await fetchHeatmap(fetcher, selection, metricType)
    // if (fetchIdx === this.latestFetchIdx) {
    // if (typeof range === 'number') {
    //   this.cache.push({
    //     dateRange: range,
    //     metricType: metricType,
    //     expireTime: new Date().getTime() / 1000 + CACHE_EXPRIE_SECS,
    //     data: data,
    //   })
    // }
    return data
    // }
    // return undefined
  }
}

// Todo: define heatmap state, with auto check control, date range select, reset to zoom
// fetchData ,  changeType, add loading state, change zoom level to reset autofetch,

type ChartState = {
  heatmapData: HeatmapData
  metricType: DataTag
}

// TODO: using global state is not a good idea
let _chart
let cache = new HeatmapCache()

const KeyViz = () => {
  const ctx = useContext(KeyVizContext)

  const [chartState, setChartState] = useState<ChartState>()
  const [getSelection, setSelection] = useGetSet<HeatmapRange | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState(0)
  const [getOnBrush, setOnBrush] = useGetSet(false)
  const [getDateRange, setDateRange] = useGetSet(3600 * 6)
  const [getBrightLevel, setBrightLevel] = useGetSet(1)
  const [getMetricType, setMetricType] = useGetSet<DataTag>('written_bytes')
  const [config, setConfig] = useState<ConfigKeyVisualConfig | null>(null)
  const [
    shouldShowSettings,
    { setTrue: openSettings, setFalse: closeSettings }
  ] = useBoolean(false)
  const { t } = useTranslation()

  const enabled = config?.auto_collection_disabled !== true

  const updateServiceStatus = useMemoizedFn(async function () {
    if (ctx?.cfg?.showSetting === false) {
      return
    }
    try {
      setLoading(true)
      const resp = await ctx!.ds.keyvisualConfigGet()
      const config = resp.data
      setConfig(config)
    } finally {
      setLoading(false)
    }
  })

  useMount(updateServiceStatus)

  const updateHeatmap = useMemoizedFn(async () => {
    try {
      setLoading(true)
      setOnBrush(false)
      const metricType = getMetricType()
      const data = await cache.fetch(
        ctx!.ds.keyvisualHeatmapsGet,
        getSelection() || getDateRange(),
        metricType
      )
      setChartState({ heatmapData: data!, metricType })
    } finally {
      setLoading(false)
    }
  })

  const onChangeBrightLevel = useMemoizedFn((val) => {
    if (!_chart) return
    setBrightLevel(val)
    _chart.brightness(val)
  })

  const onChangeDateRange = useMemoizedFn((v: number) => {
    setDateRange(v)
    setSelection(null)
  })

  const onResetZoom = useMemoizedFn(() => {
    setSelection(null)
  })

  const onToggleBrush = useMemoizedFn(() => {
    const newOnBrush = !getOnBrush()
    setAutoRefreshSeconds(0)
    setOnBrush(newOnBrush)
    _chart.brush(newOnBrush)
  })

  const onBrush = useMemoizedFn((selection: HeatmapRange) => {
    setOnBrush(false)
    setAutoRefreshSeconds(0)
    setSelection(selection)
  })

  const onZoom = useMemoizedFn(() => {
    setAutoRefreshSeconds(0)
  })

  const onChartInit = useMemoizedFn((chart) => {
    _chart = chart
    setLoading(false)
    _chart.brightness(getBrightLevel())
  })

  useChange(() => {
    if (autoRefreshSeconds > 0) {
      onResetZoom()
      setOnBrush(false)
    }
  }, [autoRefreshSeconds])

  useChange(() => {
    if (enabled) {
      updateHeatmap()
    }
  }, [config, getSelection(), getDateRange(), getMetricType()])

  const disabledPage = isLoading ? null : (
    <Result
      title={t('keyviz.settings.disabled_result.title')}
      subTitle={t('keyviz.settings.disabled_result.sub_title')}
      extra={
        <Space>
          <Button type="primary" onClick={openSettings}>
            {t('keyviz.settings.open_setting')}
          </Button>
          {!isDistro() && (
            <Button
              onClick={() => {
                window.open(t('keyviz.settings.help_url'), '_blank')
              }}
            >
              {t('keyviz.settings.help')}
            </Button>
          )}
        </Space>
      }
    />
  )

  const mainPart = !enabled
    ? disabledPage
    : chartState && (
        <Heatmap
          data={chartState.heatmapData}
          dataTag={chartState.metricType}
          onBrush={onBrush}
          onChartInit={onChartInit}
          onZoom={onZoom}
        />
      )

  return (
    <div className="PD-KeyVis">
      <KeyVizToolbar
        enabled={enabled}
        isLoading={isLoading}
        dateRange={getDateRange()}
        metricType={getMetricType()}
        brightLevel={getBrightLevel()}
        onToggleBrush={onToggleBrush}
        onResetZoom={onResetZoom}
        autoRefreshSeconds={autoRefreshSeconds}
        isOnBrush={getOnBrush()}
        showHelp={ctx!.cfg?.showHelp ?? true}
        showSetting={ctx!.cfg?.showSetting ?? true}
        onChangeBrightLevel={onChangeBrightLevel}
        onChangeMetric={setMetricType}
        onChangeDateRange={onChangeDateRange}
        onChangeAutoRefresh={setAutoRefreshSeconds}
        onRefresh={updateHeatmap}
        onShowSettings={openSettings}
      />

      {mainPart}

      <Drawer
        title={t('keyviz.settings.title')}
        width={300}
        closable={true}
        visible={shouldShowSettings}
        onClose={closeSettings}
        destroyOnClose={true}
      >
        <KeyVizSettingForm
          onClose={closeSettings}
          onConfigUpdated={updateServiceStatus}
        />
      </Drawer>
    </div>
  )
}

export default KeyViz
