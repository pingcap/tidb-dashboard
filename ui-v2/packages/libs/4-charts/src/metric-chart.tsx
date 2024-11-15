import {
  Axis,
  Chart,
  LIGHT_THEME,
  LineSeries,
  Position,
  ScaleType,
  Settings,
} from "@elastic/charts"

import { KIBANA_METRICS } from "./sample-data"

import "@elastic/charts/dist/theme_only_light.css"
// import '@elastic/charts/dist/theme_only_dark.css';

type MetricChartProps = {
  height?: number
}

export function MetricChart({ height = 200 }: MetricChartProps) {
  return (
    <Chart size={{ height }}>
      <Settings
        baseTheme={LIGHT_THEME}
        showLegend
        legendPosition={Position.Right}
      />

      <Axis id="bottom" position={Position.Bottom} ticks={7} />
      <Axis id="left" position={Position.Left} ticks={5} />
      <LineSeries
        id="lines"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor={0}
        yAccessors={[1]}
        data={KIBANA_METRICS.metrics.kibana_os_load.v1.data}
      />
    </Chart>
  )
}
