import { getValueFormat } from "@baurine/grafana-value-formats"
import {
  Axis,
  Chart,
  DARK_THEME,
  LIGHT_THEME,
  Position,
  Settings,
  niceTimeFormatByDay,
  timeFormatter,
} from "@elastic/charts"

import { renderSeriesData } from "./series-render"
import { SeriesData } from "./type"

import "@elastic/charts/dist/theme_only_light.css"
// import '@elastic/charts/dist/theme_only_dark.css';

function formatValue(value: number, unit: string) {
  const formatFn = getValueFormat(unit)
  if (unit === "short") {
    return formatFn(value, 0, 1)
  }
  return formatFn(value, 1)
}

type SeriesChartProps = {
  theme?: "light" | "dark"
  data: SeriesData[]
  unit: string
}

const dateFormatter = timeFormatter(niceTimeFormatByDay(1))

export function SeriesChart({ theme = "light", data, unit }: SeriesChartProps) {
  return (
    <Chart>
      <Settings
        baseTheme={theme === "light" ? LIGHT_THEME : DARK_THEME}
        showLegend
        legendPosition={Position.Right}
        legendSize={140}
      />

      <Axis
        id="bottom"
        position={Position.Bottom}
        ticks={7}
        showOverlappingTicks
        tickFormat={dateFormatter}
      />
      <Axis
        id="left"
        position={Position.Left}
        ticks={5}
        tickFormat={(v) => formatValue(v, unit)}
      />

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
