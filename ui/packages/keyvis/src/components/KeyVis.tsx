import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Heatmap } from '../heatmap'
import { HeatmapData, HeatmapRange, DataTag } from '../heatmap/types'
import { fetchHeatmap } from '../utils'
import ToolBar from './ToolBar'
import './KeyVis.less'

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

const KeyVis = (props) => {
  const [chartState, setChartState] = useState<ChartState>()
  const [selection, setSelection] = useState<HeatmapRange | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState(0)
  // const autoRefreshRemainingSeconds = useRef(0)
  const [remainingRefreshSeconds, setRemainingRefreshSeconds] = useState(0)
  const [isOnBrush, setOnBrush] = useState(false)
  const [dateRange, setDateRange] = useState(3600 * 6)
  const [brightLevel, setBrightLevel] = useState(1)
  const [metricType, setMetricType] = useState<DataTag>('written_bytes')

  // Tick auto refresh
  useEffect(() => {
    const timerId = setInterval(() => {
      if (autoRefreshSeconds === 0) {
        return
      }
      if (remainingRefreshSeconds == 0) {
        _fetchHeatmap()
      } else {
        setRemainingRefreshSeconds(remainingRefreshSeconds - 1)
      }
    }, 1000)

    return () => {
      clearInterval(timerId)
    }
  }, [autoRefreshSeconds, remainingRefreshSeconds])

  useEffect(() => {
    if (remainingRefreshSeconds > autoRefreshSeconds) {
      setRemainingRefreshSeconds(autoRefreshSeconds)
    }
    if (autoRefreshSeconds > 0) {
      onResetZoom()
      setOnBrush(false)
    }
  }, [autoRefreshSeconds])

  useEffect(() => {
    _fetchHeatmap()
  }, [selection, metricType, dateRange])

  const _fetchHeatmap = async () => {
    if (autoRefreshSeconds > 0) {
      setRemainingRefreshSeconds(autoRefreshSeconds)
    }
    setLoading(true)
    setOnBrush(false)
    const data = await cache.fetch(selection || dateRange, metricType)
    setChartState({ heatmapData: data!, metricType: metricType })
    setLoading(false)
  }

  const onChangeBrightLevel = (val) => {
    if (!_chart) return
    setBrightLevel(val)
    _chart.brightness(val)
  }

  const onChangeMetric = (value) => {
    setMetricType(value)
  }

  const onChartInit = useCallback(
    (chart) => {
      _chart = chart
      setLoading(false)
      setBrightLevel(1)
      _chart.brightness(1)
    },
    [props]
  )

  const onChangeAutoRefresh = (v: number) => {
    setAutoRefreshSeconds(v)
  }

  const onRefresh = () => {
    _fetchHeatmap()
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

  const onBrush = useCallback(
    (selection: HeatmapRange) => {
      setOnBrush(false)
      setAutoRefreshSeconds(0)
      setSelection(selection)
    },
    [props]
  )

  const onZoom = useCallback(() => {
    setAutoRefreshSeconds(0)
  }, [props])

  return (
    <div className="PD-KeyVis">
      <ToolBar
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
        onChangeMetric={onChangeMetric}
        onChangeDateRange={onChangeDateRange}
        // onToggleAutoFetch={onToggleAutoFetch}
        onChangeAutoRefresh={onChangeAutoRefresh}
        onRefresh={onRefresh}
      />
      {chartState && (
        <Heatmap
          data={chartState.heatmapData}
          dataTag={chartState.metricType}
          onBrush={onBrush}
          onChartInit={onChartInit}
          onZoom={onZoom}
        />
      )}
    </div>
  )
}

export default KeyVis
