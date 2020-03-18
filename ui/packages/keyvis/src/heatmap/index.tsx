import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { heatmapChart } from './chart'

import { HeatmapData, DataTag, HeatmapRange } from './types'

type HeatmapProps = {
  data: HeatmapData
  dataTag: DataTag
  onBrush: (selection: HeatmapRange) => void
  onZoom: () => void
  onChartInit: (any) => void
}

const _Heatmap: React.FunctionComponent<HeatmapProps> = props => {
  const divRef: React.RefObject<HTMLDivElement> = useRef(null)

  let chart

  useEffect(() => {
    const init = async () => {
      console.log('side effect in heatmap')
      if (divRef.current != null) {
        console.log('side effect in heatmap inside')
        const container = divRef.current
        chart = await heatmapChart(
          d3.select(container),
          props.data,
          props.dataTag,
          props.onBrush,
          props.onZoom
        )
        props.onChartInit(chart)
        const render = () => {
          const width = container.offsetWidth
          const height = container.offsetHeight
          chart.size(width, height)
        }
        window.onresize = render
        render()
      }
    }
    init()
  }, [divRef.current, props.data, props.dataTag])

  return <div className="heatmap" ref={divRef} />
}

export const Heatmap = React.memo(_Heatmap)
