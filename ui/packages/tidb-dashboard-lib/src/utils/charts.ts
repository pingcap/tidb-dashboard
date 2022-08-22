import {
  PartialTheme,
  SettingsProps,
  TickFormatter,
  timeFormatter,
  TooltipSettings,
  TooltipStickTo,
  TooltipType,
  TooltipValue
} from '@elastic/charts'
import { TimeRangeValue } from '@lib/components'
import dayjs from 'dayjs'
import React, { useRef } from 'react'
import { DEFAULT_MIN_INTERVAL_SEC } from './prometheus'
import '@elastic/charts/dist/theme_only_light.css'
import tz from './timezone'

/**
 * A human readable tick label formatter for time series data. It scales according to the data domain.
 */
export function timeTickFormatter(range: TimeRangeValue): TickFormatter {
  // const minDate = moment(range[0] * 1000)
  // const maxDate = moment(range[1] * 1000)
  // const diff = maxDate.diff(minDate, 'minutes')

  const minDate = dayjs(range[0] * 1000)
  const maxDate = dayjs(range[1] * 1000)
  const diff = maxDate.diff(minDate, 'minutes')
  const format = niceTimeFormatByDay(diff)

  function formatter(v): string {
    return timeFormatter(format)(v, { timeZone: tz.getTimeZoneStr() })
  }
  return formatter
}

function niceTimeFormatByDay(days: number) {
  if (days > 5 * 60 * 24) return 'MM-DD'
  if (days > 1 * 60 * 24) return 'MM-DD HH:mm'
  if (days > 5) return 'HH:mm'
  return 'HH:mm:ss'
}

export function timeTooltipFormatter({ value }: TooltipValue): string {
  return timeFormatter('YYYY-MM-DD HH:mm:ss (UTCZ)')(value, {
    timeZone: tz.getTimeZoneStr()
  })
}

export const DEFAULT_TOOLTIP_SETTINGS: TooltipSettings = {
  type: TooltipType.Crosshairs,
  headerFormatter: timeTooltipFormatter,
  stickTo: TooltipStickTo.MousePosition
}

export const DEFAULT_THEME: PartialTheme = {
  axes: {
    tickLine: { visible: false },
    tickLabel: { padding: { inner: 10 } },
    gridLine: {
      horizontal: {
        visible: true,
        dash: [3, 3]
      },
      vertical: {
        visible: true,
        dash: [3, 3]
      }
    }
  },
  crosshair: {
    crossLine: {
      dash: []
    },
    line: {
      dash: []
    }
  }
}

export const DEFAULT_CHART_SETTINGS: SettingsProps = {
  showLegend: true,
  showLegendExtra: true,
  tooltip: DEFAULT_TOOLTIP_SETTINGS,
  theme: DEFAULT_THEME
}

export type ChartHandle = {
  calcIntervalSec: (range: TimeRangeValue, minIntervalSec?: number) => number
}

/**
 * Align the time range according to the minimal interval and minimal range size.
 */
export function alignRange(
  range: TimeRangeValue,
  minIntervalSec = DEFAULT_MIN_INTERVAL_SEC,
  minRangeSec = 60
): TimeRangeValue {
  let [min, max] = range
  if (max - min < minRangeSec) {
    min = max - minRangeSec
  }
  min = Math.floor(min / minIntervalSec) * minIntervalSec
  max = Math.ceil(max / minIntervalSec) * minIntervalSec
  return [min, max]
}

export function useChartHandle(
  containerRef: React.RefObject<HTMLDivElement>,
  legendWidth: number = 0,
  minBinWidth: number = 5
): [ChartHandle] {
  const chartRef = useRef<ChartHandle>({
    calcIntervalSec: (range, minIntervalSec = DEFAULT_MIN_INTERVAL_SEC) => {
      const maxDataPoints =
        ((containerRef.current?.offsetWidth ?? 0) - legendWidth) / minBinWidth
      if (maxDataPoints <= 0) {
        return minIntervalSec
      }
      const interval = (range[1] - range[0]) / maxDataPoints
      const roundedInterval =
        Math.floor(interval / minIntervalSec) * minIntervalSec
      return Math.max(minIntervalSec, roundedInterval)
    }
  })
  return [chartRef.current]
}
