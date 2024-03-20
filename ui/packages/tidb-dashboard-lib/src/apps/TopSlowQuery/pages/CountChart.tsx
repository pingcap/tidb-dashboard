import React, { useMemo } from 'react'
import {
  Axis,
  Chart,
  Position,
  ScaleType,
  Settings,
  LineSeries,
  timeFormatter
} from '@elastic/charts'
import { DEFAULT_CHART_SETTINGS, timeTickFormatter } from '@lib/utils/charts'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { TimeRangeValue } from 'metrics-chart'

export function CountChart({
  data,
  timeRange
}: {
  data: [number, number][]
  timeRange: TimeRangeValue
}) {
  const convertedData = useMemo(() => {
    return (data ?? []).map(([time, count]) => [time * 1000, count])
  }, [data])

  return (
    <Chart>
      <Settings
        {...DEFAULT_CHART_SETTINGS}
        showLegend={false}
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
      <LineSeries
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
