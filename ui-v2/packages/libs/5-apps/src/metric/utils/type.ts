export type SeriesType = "bar_stacked" | "area_stack" | "line" | "area"
export enum TransformNullValue {
  NULL = "null",
  AS_ZERO = "as_zero",
}

export interface SingleQueryConfig {
  promql: string
  name: string
  type: SeriesType
  color?: string | ((seriesName: string) => string | undefined)
  // lineSeriesStyle?: RecursivePartial<LineSeriesStyle>
}

export interface SingleChartConfig {
  title: string
  label?: string
  queries: SingleQueryConfig[]
  nullValue?: TransformNullValue
  unit: string
  // yAxisFormat?: TickFormatter<any>
}

export interface SinglePanelConfig {
  category: string
  charts: SingleChartConfig[]
}
