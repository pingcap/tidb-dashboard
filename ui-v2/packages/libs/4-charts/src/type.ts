import { LineSeriesStyle, RecursivePartial } from "@elastic/charts"

export type SeriesType = "line" | "area" | "bar_stacked" | "area_stack"

export type DataPoint = [msTimestamp: number, value: number | null]

export type SeriesData = {
  id: string
  name: string
  data: DataPoint[]
  type?: SeriesType
  color?: string | ((seriesName: string) => string | undefined)
  lineSeriesStyle?: RecursivePartial<LineSeriesStyle>
}
