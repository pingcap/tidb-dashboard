import { getValueFormat } from "@baurine/grafana-value-formats"
import {
  Axis,
  Chart,
  DARK_THEME,
  LIGHT_THEME,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  timeFormatter,
} from "@elastic/charts"
import { useMemo } from "react"

import { renderSeriesData } from "./series-render"
import { SeriesData } from "./type"

function formatNumByUnit(value: number, unit: string) {
  const formatFn = getValueFormat(unit)
  if (!formatFn) {
    return value + ""
  }
  if (unit === "short") {
    return formatFn(value, 0, 1)
  }
  return formatFn(value, 1)
}

function niceTimeFormat(seconds: number) {
  // if (max time - min time > 5 days)
  if (seconds > 5 * 24 * 60 * 60) return "MM-DD"
  // if (max time - min time > 1 day)
  if (seconds > 1 * 24 * 60 * 60) return "MM-DD HH:mm"
  // if (max time - min time > 5 minutes)
  if (seconds > 5 * 60) return "HH:mm"
  return "HH:mm:ss"
}

const tooltipHeaderFormatter = timeFormatter("YYYY-MM-DD HH:mm:ss")

type SeriesChartProps = {
  theme?: "light" | "dark"
  data: SeriesData[]
  unit: string
  timeRange: [number, number]
}

export function SeriesChart({
  theme = "light",
  data,
  unit,
  timeRange,
}: SeriesChartProps) {
  const xAxisFormatter = useMemo(
    () => timeFormatter(niceTimeFormat(timeRange[1] - timeRange[0])),
    [timeRange],
  )

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
        tickFormat={tooltipHeaderFormatter}
        labelFormat={xAxisFormatter}
      />
      <Axis
        id="left"
        position={Position.Left}
        ticks={5}
        tickFormat={(v) => formatNumByUnit(v, unit)}
      />

      {data.map(renderSeriesData)}

      {/* for avoid chart to show "no data" when data is empty */}
      {data.length === 0 && (
        <LineSeries
          id="_placeholder"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={0}
          yAccessors={[1]}
          hideInLegend
          data={[
            [timeRange[0] * 1000, null],
            [timeRange[1] * 1000, null],
          ]}
        />
      )}

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
