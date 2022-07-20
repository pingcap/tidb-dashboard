import { BarSeries, LineSeries, ScaleType, AreaSeries } from '@elastic/charts'
import { DataPoint } from '@lib/utils/prometheus'
import React from 'react'

export type GraphType = 'bar_stacked' | 'line' | 'stack'

export type QueryData = {
  id: string
  name: string
  data: DataPoint[]
  color?: string
}

export function renderQueryData(type: GraphType, qd: QueryData) {
  switch (type) {
    case 'bar_stacked':
      return renderStackedBar(qd)
    case 'line':
      return renderLine(qd)
    case 'stack':
      return renderStack(qd)
  }
}

function renderStackedBar(qd: QueryData) {
  return (
    <BarSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      stackAccessors={[0]}
      data={qd.data}
      name={qd.name}
      color={qd.color}
    />
  )
}

function renderLine(qd: QueryData) {
  return (
    <LineSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      data={qd.data}
      name={qd.name}
      color={qd.color}
      lineSeriesStyle={{
        line: {
          strokeWidth: 2
        },
        point: {
          visible: false
        }
      }}
    />
  )
}

function renderStack(qd: QueryData) {
  return (
    <AreaSeries
      key={qd.id}
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      stackAccessors={[0]}
      data={qd.data}
      name={qd.name}
      color={qd.color}
    />
  )
}
