import { LineSeriesStyle, RecursivePartial } from "@elastic/charts"

export type SeriesDataType = "line" | "area" | "bar_stacked" | "area_stack"

export type DataPoint = [msTimestamp: number, value: number | null]

export type SeriesData = {
  id: string
  name: string
  data: DataPoint[]
  type?: SeriesDataType
  color?: string | ((seriesName: string) => string | undefined)
  lineSeriesStyle?: RecursivePartial<LineSeriesStyle>
}
