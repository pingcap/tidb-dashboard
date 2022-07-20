import { BarSeries, LineSeries, ScaleType, AreaSeries } from '@elastic/charts'
import { DataPoint, ColorType } from '@lib/utils/prometheus'
import React from 'react'

export type GraphType = 'bar_stacked' | 'area_stack' | 'line'

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
    case 'area_stack':
      return renderAreaStack(qd)
    case 'line':
      return renderLine(qd)
  }
}

function transformLengendColor(legendLabel: string) {
  switch (legendLabel) {
    case 'Cop':
      return ColorType.BLUE_1
    case 'Select':
    case 'Get':
      return ColorType.BLUE_3
    case 'BatchGet':
      return ColorType.BLUE_4
    case 'Commit':
      return ColorType.GREEN_2
    case 'Insert':
    case 'Prewrite':
    case 'execute':
      return ColorType.GREEN_3
    case 'Update':
    case 'Commit':
      return ColorType.GREEN_4
    case 'parse':
      return ColorType.RED_2
    case 'Show':
    case 'get token':
      return ColorType.RED_3
    case 'PessimisticLock':
      return ColorType.RED_4
    case 'tso_wait':
      return ColorType.RED_5
    case 'Scan':
      return ColorType.PURPLE
    case 'execute time':
    case 'database time':
      return ColorType.YELLOW
    case 'compile':
      return ColorType.ORANGE
    default:
      return undefined
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
      color={transformLengendColor(qd.name)}
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
      color={transformLengendColor(qd.name)}
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
      id={qd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      stackAccessors={[0]}
      data={qd.data}
      name={qd.name}
      color={transformLengendColor(qd.name)}
    />
  )
}
