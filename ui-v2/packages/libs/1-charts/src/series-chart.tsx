import { getValueFormat } from "@baurine/grafana-value-formats"
import {
  Axis,
  BrushEvent,
  Chart,
  DARK_THEME,
  LIGHT_THEME,
  LegendValue,
  LineSeries,
  Position,
  ScaleType,
  SeriesIdentifier,
  Settings,
  SettingsProps,
  timeFormatter,
} from "@elastic/charts"
import { useCallback, useMemo } from "react"

import { renderSeriesData } from "./series-render"
import { SeriesData } from "./type"

function formatNumByUnit(value: number, unit: string) {
  const formatFn = getValueFormat(unit)
  if (!formatFn) {
    return value + ""
  }
  return formatFn(value, 2)
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

// align the time range according to the minimal interval and minimal range size.
export function alignRange(
  range: TimeRangeValue,
  minIntervalSec = 30,
  minRangeSec = 60,
): TimeRangeValue {
  let [min, max] = range
  if (max - min < minRangeSec) {
    min = max - minRangeSec
  }
  min = Math.floor(min / minIntervalSec) * minIntervalSec
  max = Math.ceil(max / minIntervalSec) * minIntervalSec
  return [min, max]
}

const tooltipHeaderFormatter = timeFormatter("YYYY-MM-DD HH:mm:ss")

type TimeRangeValue = [number, number]

type SeriesChartProps = {
  theme?: "light" | "dark"
  data: SeriesData[]
  unit: string
  timeRange: TimeRangeValue
  charSetting?: SettingsProps
  onBrush?: (range: TimeRangeValue) => void
}

export function SeriesChart({
  theme = "light",
  data,
  unit,
  timeRange,
  charSetting,
  onBrush,
}: SeriesChartProps) {
  const xAxisFormatter = useMemo(
    () => timeFormatter(niceTimeFormat(timeRange[1] - timeRange[0])),
    [timeRange],
  )

  // note: this doesn't work with StrictMode in debug mode (it's fine in production)
  const handleBrushEnd = useCallback(
    (ev: BrushEvent) => {
      if (!ev.x) {
        return
      }
      const timeRange: TimeRangeValue = [
        Math.floor((ev.x[0] as number) / 1000),
        Math.floor((ev.x[1] as number) / 1000),
      ]
      onBrush?.(alignRange(timeRange))
    },
    [onBrush],
  )

  // @todo: it seems doesn't work, try it later
  const specIds = useMemo(() => data.map((d) => d.id), [data])
  const handleLegendSort = useCallback(
    (a: SeriesIdentifier, b: SeriesIdentifier) => {
      return specIds.indexOf(a.specId) - specIds.indexOf(b.specId)
    },
    [specIds],
  )

  return (
    <Chart>
      <Settings
        baseTheme={theme === "light" ? LIGHT_THEME : DARK_THEME}
        showLegend
        legendPosition={Position.Right}
        legendSize={200}
        legendValues={[LegendValue.Average]}
        legendSort={handleLegendSort}
        xDomain={{ min: timeRange[0] * 1000, max: timeRange[1] * 1000 }}
        onBrushEnd={onBrush && handleBrushEnd}
        {...charSetting}
      />

      <Axis
        id="bottom"
        position={Position.Bottom}
        ticks={6}
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
    </Chart>
  )
}
