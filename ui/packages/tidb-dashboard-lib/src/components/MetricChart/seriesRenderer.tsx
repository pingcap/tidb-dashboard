import { BarSeries, LineSeries, ScaleType, AreaSeries } from '@elastic/charts'
import { DataPoint } from '@lib/utils/prometheus'
import React from 'react'

export type GraphType = 'bar_stacked' | 'area_stack' | 'line' | 'mixed'

export type QueryData = {
  id: string
  name: string
  data: DataPoint[]
  color?: string
  type?: GraphType
}

export function renderQueryData(type: GraphType, qd: QueryData) {
  switch (type) {
    case 'bar_stacked':
      return renderStackedBar(qd)
    case 'area_stack':
      return renderAreaStack(qd)
    case 'line':
      return renderLine(qd)
    case 'mixed':
      return renderMixed(qd)
  }
}

function renderMixed(qd: QueryData) {
  return (
    <>
      {qd.type === 'line' && <>{renderLine(qd)}</>}
      {qd.type === 'bar_stacked' && <>{renderStackedBar(qd)}</>}
    </>
  )
}

function renderStackedBar(qd: QueryData) {
  return (
    <BarSeries
      key={qd.id}
      id={qd.name}
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
      id={qd.name}
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

function renderAreaStack(qd: QueryData) {
  return (
    <AreaSeries
      key={qd.id}
      id={qd.name}
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
