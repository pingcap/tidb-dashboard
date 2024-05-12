import React, { useMemo } from 'react'
import {
  Axis,
  Chart,
  Position,
  ScaleType,
  Settings,
  timeFormatter,
  BrushEvent,
  BarSeries
} from '@elastic/charts'
import { DEFAULT_CHART_SETTINGS } from '@lib/utils/charts'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { TimeRangeValue } from 'metrics-chart'

export function CountChart({
  data,
  timeRange,
  onSelectTimeRange
}: {
  data: [number, number][]
  timeRange: TimeRangeValue
  onSelectTimeRange?: (timeRange: TimeRangeValue) => void
}) {
  const convertedData = useMemo(() => {
    return (data || []).map(([time, count]) => [time * 1000, count])
  }, [data])

  function onBrushEnd(e: BrushEvent) {
    if (!e.x) {
      return
    }

    let value: [number, number]
    const tr = e.x.map((d) => d / 1000)
    const delta = tr[1] - tr[0]
    if (delta < 60) {
      const offset = Math.floor(delta / 2)
      value = [Math.ceil(tr[0] + offset - 30), Math.floor(tr[1] - offset + 30)]
    } else {
      value = [Math.ceil(tr[0]), Math.floor(tr[1])]
    }
    onSelectTimeRange?.(value)
  }

  return (
    <Chart>
      <Settings
        {...DEFAULT_CHART_SETTINGS}
        showLegend={false}
        onBrushEnd={onSelectTimeRange ? onBrushEnd : undefined}
        xDomain={{
          min: timeRange[0] * 1000,
          max: timeRange[1] * 1000
        }}
      />
      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={timeFormatter('MM-DD HH:mm')}
      />
      <Axis
        id="left"
        title="Count"
        position={Position.Left}
        showOverlappingTicks
        tickFormat={(v) => getValueFormat('short')(v, 0, 1)}
        ticks={5}
      />
      <BarSeries
        id="count"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor={0}
        yAccessors={[1]}
        data={convertedData}
      />
    </Chart>
  )
}
