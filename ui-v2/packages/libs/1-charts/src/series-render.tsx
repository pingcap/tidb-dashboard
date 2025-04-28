import { AreaSeries, BarSeries, LineSeries, ScaleType } from "@elastic/charts"

import { SeriesData } from "./type"

export function renderSeriesData(sd: SeriesData) {
  if (sd.type === "line") {
    return renderLine(sd)
  } else if (sd.type === "bar_stacked") {
    return renderStackedBar(sd)
  } else if (sd.type === "area_stack") {
    return renderAreaStack(sd)
  } else if (sd.type === "area") {
    return renderArea(sd)
  }
  return renderLine(sd)
}

function renderLine(sd: SeriesData) {
  return (
    <LineSeries
      key={sd.id}
      id={sd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      data={sd.data}
      name={sd.name}
      color={typeof sd.color === "function" ? sd.color(sd.name) : sd.color}
      lineSeriesStyle={{
        line: {
          strokeWidth: 2,
        },
        point: {
          visible: "never",
        },
        ...sd.lineSeriesStyle,
      }}
    />
  )
}

function renderStackedBar(sd: SeriesData) {
  return (
    <BarSeries
      key={sd.id}
      id={sd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      stackAccessors={[0]}
      data={sd.data}
      name={sd.name}
      color={typeof sd.color === "function" ? sd.color(sd.name) : sd.color}
    />
  )
}

function renderAreaStack(sd: SeriesData) {
  return (
    <AreaSeries
      key={sd.id}
      id={sd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      stackAccessors={[0]}
      data={sd.data}
      name={sd.name}
      color={typeof sd.color === "function" ? sd.color(sd.name) : sd.color}
    />
  )
}

function renderArea(sd: SeriesData) {
  return (
    <AreaSeries
      key={sd.id}
      id={sd.id}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      data={sd.data}
      name={sd.name}
      color={typeof sd.color === "function" ? sd.color(sd.name) : sd.color}
    />
  )
}
