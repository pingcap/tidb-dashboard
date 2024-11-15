import { Axis, Chart, LIGHT_THEME, Position, Settings } from "@elastic/charts"

import { renderSeriesData } from "./series-render"
import { SeriesData } from "./type"

import "@elastic/charts/dist/theme_only_light.css"
// import '@elastic/charts/dist/theme_only_dark.css';

type SeriesChartProps = {
  height?: number
  data: SeriesData[]
}

export function SeriesChart({ height = 200, data }: SeriesChartProps) {
  return (
    <Chart size={{ height }}>
      <Settings
        baseTheme={LIGHT_THEME}
        showLegend
        legendPosition={Position.Right}
      />

      <Axis id="bottom" position={Position.Bottom} ticks={7} />
      <Axis id="left" position={Position.Left} ticks={5} />

      {data.map(renderSeriesData)}

      {/* 
      <LineSeries
        id="lines"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor={0}
        yAccessors={[1]}
        data={KIBANA_METRICS.metrics.kibana_os_load.v1.data}
      /> 
      */}
    </Chart>
  )
}
