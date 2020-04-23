import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Button, Drawer } from 'antd'
import { useTranslation } from 'react-i18next'
import useInterval from '@use-it/interval'
import { Heatmap } from '../heatmap'
import { HeatmapData, HeatmapRange, DataTag } from '../heatmap/types'
import { fetchHeatmap, fetchServiceStatus } from '../utils'
import ToolBar from './ToolBar'
import KeyVizSettingForm from './KeyVizSettingForm'
import './KeyViz.less'

type CacheEntry = {
  metricType: DataTag
  dateRange: number
  expireTime: number
  data: HeatmapData
}

// const CACHE_EXPRIE_SECS = 10

class HeatmapCache {
  // cache: CacheEntry[] = []
  // latestFetchIdx = 0

  async fetch(
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
        endtime: endTime,
      }
      // }
    } else {
      selection = range
    }

    // this.latestFetchIdx += 1
    // const fetchIdx = this.latestFetchIdx
    const data = await fetchHeatmap(selection, metricType)
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

const KeyViz = (props) => {
  const [chartState, setChartState] = useState<ChartState>()
  const [selection, setSelection] = useState<HeatmapRange | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState(0)
  const autoRefreshSecondsRef = useRef(autoRefreshSeconds)
  const [remainingRefreshSeconds, setRemainingRefreshSeconds] = useState(0)
  const [isOnBrush, setOnBrush] = useState(false)
  const [dateRange, setDateRange] = useState(3600 * 6)
  const [brightLevel, setBrightLevel] = useState(1)
  const [metricType, setMetricType] = useState<DataTag>('written_bytes')
  const [serviceEnabled, setServiceEnabled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { t } = useTranslation()

  const onFetchServiceStatus = () => {
    setLoading(true)
    fetchServiceStatus().then(
      (status) => {
        if (!status) {
          setAutoRefreshSeconds(0)
        }
        setServiceEnabled(status)
        setLoading(false)
      },
      () => {
        setLoading(false)
      }
    )
  }

  const onFetchHeatmap = useCallback(() => {
    if (autoRefreshSecondsRef.current > 0) {
      setRemainingRefreshSeconds(autoRefreshSecondsRef.current)
    }
    setLoading(true)
    setOnBrush(false)
    cache.fetch(selection || dateRange, metricType).then(
      (data) => {
        setChartState({ heatmapData: data!, metricType: metricType })
        setLoading(false)
      },
      () => {
        setLoading(false)
      }
    )
  }, [selection, dateRange, metricType])

  const onChangeBrightLevel = (val) => {
    if (!_chart) return
    setBrightLevel(val)
    _chart.brightness(val)
  }

  const onChangeDateRange = (v: number) => {
    setDateRange(v)
    setSelection(null)
  }

  const onResetZoom = () => {
    setSelection(null)
  }

  const onToggleBrush = () => {
    setAutoRefreshSeconds(0)
    setOnBrush(!isOnBrush)
    _chart.brush(!isOnBrush)
  }

  const onBrush = useCallback((selection: HeatmapRange) => {
    setOnBrush(false)
    setAutoRefreshSeconds(0)
    setSelection(selection)
  }, [])

  const onZoom = useCallback(() => {
    setAutoRefreshSeconds(0)
  }, [])

  const onChartInit = useCallback((chart) => {
    _chart = chart
    setLoading(false)
    setBrightLevel((l) => {
      _chart.brightness(l)
      return l
    })
  }, [])

  useEffect(() => {
    autoRefreshSecondsRef.current = autoRefreshSeconds
  }, [autoRefreshSeconds])

  useEffect(onFetchServiceStatus, [])

  useEffect(() => {
    if (serviceEnabled) {
      onFetchHeatmap()
    }
  }, [serviceEnabled, onFetchHeatmap])

  useEffect(() => {
    setRemainingRefreshSeconds((r) => {
      if (r > autoRefreshSeconds) {
        return autoRefreshSeconds
      } else {
        return r
      }
    })

    if (autoRefreshSeconds > 0) {
      onResetZoom()
      setOnBrush(false)
    }
  }, [autoRefreshSeconds])

  useInterval(() => {
    if (autoRefreshSeconds === 0) {
      return
    }
    if (remainingRefreshSeconds === 0) {
      onFetchHeatmap()
    } else {
      setRemainingRefreshSeconds((c) => c - 1)
    }
  }, 1000)

  const mainPart = serviceEnabled ? (
    chartState && (
      <Heatmap
        data={chartState.heatmapData}
        dataTag={chartState.metricType}
        onBrush={onBrush}
        onChartInit={onChartInit}
        onZoom={onZoom}
      />
    )
  ) : (
    <div className="keyviz_disabled_container">
      <h2>{t('keyviz.settings.disabled_desc_title')}</h2>
      <div className="keyviz_disabled_desc">
        <p>{t('keyviz.settings.disabled_desc_line_1')}</p>
        <p>{t('keyviz.settings.disabled_desc_line_2')}</p>
      </div>
      <Button type="primary" onClick={() => setShowSettings(true)}>
        {t('keyviz.settings.open_setting')}
      </Button>
    </div>
  )

  return (
    <div className="PD-KeyVis">
      <ToolBar
        enabled={serviceEnabled}
        dateRange={dateRange}
        metricType={metricType}
        brightLevel={brightLevel}
        onToggleBrush={onToggleBrush}
        onResetZoom={onResetZoom}
        isLoading={isLoading}
        autoRefreshSeconds={autoRefreshSeconds}
        remainingRefreshSeconds={remainingRefreshSeconds}
        isOnBrush={isOnBrush}
        onChangeBrightLevel={onChangeBrightLevel}
        onChangeMetric={setMetricType}
        onChangeDateRange={onChangeDateRange}
        onChangeAutoRefresh={setAutoRefreshSeconds}
        onRefresh={onFetchHeatmap}
        onShowSettings={() => setShowSettings(true)}
      />
      {mainPart}
      <Drawer
        title={t('keyviz.settings.title')}
        width={300}
        closable={true}
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        destroyOnClose={true}
      >
        <KeyVizSettingForm
          onClose={() => setShowSettings(false)}
          onConfigUpdated={onFetchServiceStatus}
        />
      </Drawer>
    </div>
  )
}

export default KeyViz
