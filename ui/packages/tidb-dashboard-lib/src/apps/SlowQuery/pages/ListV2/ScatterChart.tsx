import { PlotEvent } from '@ant-design/plots'
import { MixOptions, Plot } from '@antv/g2plot'
import {
  TimeSeriesChart,
  PromDataAccessor,
  PromQueryGroup,
  Trigger,
  Chart
} from '@diag-ui/chart'
import { TimeRange, toTimeRangeValue } from '@lib/components'
import { useChange } from '@lib/utils/useChange'
import React, { useRef } from 'react'

import { DisplayOptions } from './Selections'

interface SlowQueryChartProps {
  timeRange: TimeRange
  displayOptions: DisplayOptions
  onLegendChange?: OnLegendChange
}

export const SlowQueryScatterChart: React.FC<SlowQueryChartProps> = React.memo(
  ({ timeRange, displayOptions, onLegendChange }) => {
    const triggerRef = useRef<Trigger>(null as any)
    const chartRef = useRef<Chart>(null)
    const { aggr_by, group_by, tiflash } = displayOptions
    const inited = useRef(false)
    const { cacheFetch, markInPlace } = useCacheFetch(displayOptions)
    const { bindLegendClick } = useLegendAction(onLegendChange)

    const refreshChart = (inPlace = false) => {
      const tr = toTimeRangeValue(timeRange)
      markInPlace(inPlace)
      onLegendChange?.({ isSelectAll: true, data: [] })
      triggerRef.current({ start_time: tr[0], end_time: tr[1] })
    }

    useChange(() => {
      refreshChart()
    }, [aggr_by, timeRange])

    useChange(() => {
      if (!inited.current) {
        inited.current = true
        return
      }
      refreshChart(true)
    }, [group_by, tiflash])

    return (
      <PromDataAccessor fetch={cacheFetch} ref={triggerRef}>
        <TimeSeriesChart
          ref={chartRef}
          onReady={(plot) => bindLegendClick(plot)}
        >
          <PromQueryGroup
            queries={[
              {
                promql: '',
                name: '{name}',
                type: 'scatter'
              }
            ]}
            unit="bytes"
          />
        </TimeSeriesChart>
      </PromDataAccessor>
    )
  }
)

interface OnLegendChange {
  (evt: { isSelectAll: boolean; data: any[] }): void
}

const useLegendAction = (onLegendChange?: OnLegendChange) => {
  const bindLegendClick = (plot: Plot<MixOptions>) => {
    if (!onLegendChange) {
      return
    }
    plot.on('legend-item:click', (evt: PlotEvent) => {
      const data = evt.view.views[0].getData()
      const legends = evt.target.get('delegateObject').legend.get('items')
      const isSelectAll = legends.every((item) => !item.unchecked)
      onLegendChange({ isSelectAll, data })
    })
  }

  return { bindLegendClick }
}

const useCacheFetch = (displayOptions: DisplayOptions) => {
  const cacheRef = useRef<Promise<any>>(null) as React.MutableRefObject<
    Promise<any>
  >
  const resultCache = useRef<any>(null) as React.MutableRefObject<any>
  const isInPlace = useRef(false)
  const cacheFetch = (query, tp) => {
    const { aggr_by, group_by, tiflash } = displayOptions
    if (!isInPlace.current) {
      cacheRef.current = fetch(
        `http://127.0.0.1:8428/api/v1/query_range?query=${aggr_by}&start=${tp.start_time}&end=${tp.end_time}&step=1m`
      )
        .then((resp) => resp.json())
        .then((resp) => {
          resultCache.current = resp.data.result
          return resp
        })
    }
    return cacheRef.current.then((resp) => {
      resp.data.result =
        tiflash !== 'all'
          ? resultCache.current.filter((d) => tiflash === d.metric.use_tiflash)
          : resultCache.current

      resp.data.result.forEach((d) => {
        d.metric.name = d.metric[group_by!] || 'Unknwon'
      })
      return resp
    })
  }
  const markInPlace = (_isInPlace: boolean) => {
    isInPlace.current = _isInPlace
  }

  return { cacheFetch, markInPlace }
}
