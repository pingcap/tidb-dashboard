import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { useEventListener } from '@umijs/hooks'
import { heatmapChart } from './chart'
import { HeatmapData, DataTag, HeatmapRange } from './types'

type HeatmapProps = {
  data: HeatmapData
  dataTag: DataTag
  onBrush: (selection: HeatmapRange) => void
  onZoom: () => void
  onChartInit: (any) => void
}

const _Heatmap: React.FunctionComponent<HeatmapProps> = (props) => {
  const divRef: React.RefObject<HTMLDivElement> = useRef(null)
  const chart = useRef<any>(null)

  function updateChartSize() {
    if (divRef.current == null) {
      return
    }
    if (!chart.current) {
      return
    }
    const container = divRef.current
    const width = container.offsetWidth
    const height = container.offsetHeight
    chart.current.size(width, height)
  }

  useEffect(() => {
    const init = async () => {
      if (divRef.current != null) {
        const container = divRef.current
        chart.current = await heatmapChart(
          d3.select(container),
          props.data,
          props.dataTag,
          props.onBrush,
          props.onZoom
        )
        props.onChartInit(chart.current)
        updateChartSize()
      }
    }
    init()
  }, [props, props.data, props.dataTag])

  useEventListener('resize', () => {
    updateChartSize()
  })

  return <div className="heatmap" ref={divRef} />
}

export const Heatmap = React.memo(_Heatmap)
