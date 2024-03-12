import React, { useMemo } from 'react'
import {
  Axis,
  Chart,
  Position,
  ScaleType,
  Settings,
  LineSeries
} from '@elastic/charts'
import { DEFAULT_CHART_SETTINGS, timeTickFormatter } from '@lib/utils/charts'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { TimeRangeValue } from 'metrics-chart'

export function CountChart({ data }: { data: [number, number][] }) {
  const convertedData = useMemo(() => {
    return (data ?? []).map(([time, count]) => [time * 1000, count])
  }, [data])
  const minMax = useMemo(() => {
    if (data.length === 0) {
      return [0, 0]
    }
    return [data[0][0], data[data.length - 1][0]]
  }, [data])

  return (
    <Chart>
      <Settings {...DEFAULT_CHART_SETTINGS} showLegend={false} />
      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={timeTickFormatter(minMax as TimeRangeValue)}
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
