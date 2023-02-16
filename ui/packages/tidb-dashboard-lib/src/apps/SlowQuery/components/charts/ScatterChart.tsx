import { PlotEvent } from '@ant-design/plots'
import { MixOptions, Plot } from '@antv/g2plot'
import {
  TimeSeriesChart,
  PromDataAccessor,
  PromQueryGroup,
  Trigger,
  Chart
} from '@diag-ui/chart'
import { TimeRangeValue } from '@lib/components'
import { useChange } from '@lib/utils/useChange'
import React, { useContext, useRef } from 'react'
import { SlowQueryContext } from '../../context'

export interface DisplayOptions {
  aggrBy?: 'slow_query_query_time' | 'slow_query_memory_max'
  groupBy?: 'query' | 'user' | 'database' | 'use_tiflash'
  tiflash?: 'all' | 'yes' | 'no'
}

interface SlowQueryChartProps {
  timeRangeValue: TimeRangeValue
  displayOptions: DisplayOptions
  onLegendChange?: OnLegendChange
  height?: number
}

export const SlowQueryScatterChart: React.FC<SlowQueryChartProps> = React.memo(
  ({ timeRangeValue, displayOptions, height, onLegendChange }) => {
    const triggerRef = useRef<Trigger>(null as any)
    const chartRef = useRef<Chart>(null)
    const { aggrBy, groupBy, tiflash } = displayOptions
    const inited = useRef(false)
    const { cacheFetch, markInPlace } = useCacheFetch(displayOptions)
    const { bindLegendClick } = useLegendAction(onLegendChange)

    const refreshChart = (inPlace = false) => {
      markInPlace(inPlace)
      onLegendChange?.({ isSelectAll: true, data: [] })
      // triggerRef.current({ start_time: 1668936700, end_time: 1668938500 })
      triggerRef.current({
        start_time: timeRangeValue[0],
        end_time: timeRangeValue[1]
      })
    }

    useChange(() => {
      refreshChart()
    }, [aggrBy, timeRangeValue.toString()])

    useChange(() => {
      if (!inited.current) {
        inited.current = true
        return
      }
      refreshChart(true)
    }, [groupBy, tiflash])

    return (
      <PromDataAccessor fetch={cacheFetch} ref={triggerRef}>
        <TimeSeriesChart
          ref={chartRef}
          onReady={(plot) => bindLegendClick(plot)}
          height={height}
        >
          <PromQueryGroup
            queries={[
              {
                promql: `${aggrBy!}{query!=""}`,
                name: '{name}',
                type: 'scatter'
              }
            ]}
            unit={aggrBy === 'slow_query_query_time' ? 's' : 'bytes'}
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
  const ctx = useContext(SlowQueryContext)
  const cacheRef = useRef<Promise<any>>(null) as React.MutableRefObject<
    Promise<any>
  >
  const resultCache = useRef<any>(null) as React.MutableRefObject<any>
  const isInPlace = useRef(false)
  const cacheFetch = (query, tp) => {
    const { groupBy, tiflash } = displayOptions
    if (!isInPlace.current) {
      cacheRef.current =
        ctx?.ds
          .promqlQueryRange?.(query, tp.start_time, tp.end_time, '1m')
          .then((resp) => {
            resultCache.current = (resp.data as any).result
            return resp
          }) || Promise.resolve(null)
    }
    return cacheRef.current.then((resp) => {
      resp.data.result =
        tiflash !== 'all'
          ? resultCache.current.filter((d) => tiflash === d.metric.use_tiflash)
          : resultCache.current

      resp.data.result.forEach((d) => {
        d.metric.name = d.metric[groupBy!] || 'Unknwon'
      })
      return resp
    })
  }
  const markInPlace = (_isInPlace: boolean) => {
    isInPlace.current = _isInPlace
  }

  return { cacheFetch, markInPlace }
}
