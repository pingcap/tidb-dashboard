import { SeriesType } from "@pingcap-incubator/tidb-dashboard-lib-charts"

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

////////////////////////////////
// prom

export type PromResultItem = {
  metric: Record<string, string>
  values: [number, string][]
}
