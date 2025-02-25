import { SeriesDataType } from "@pingcap-incubator/tidb-dashboard-lib-charts"
import { TransformNullValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"

export type MetricConfigKind =
  | "normal"
  | "azores-overview"
  | "azores-host"
  | "azores-cluster-overview"
  | "azores-cluster"

export interface SingleQueryConfig {
  promql: string
  legendName: string
  type: SeriesDataType
  color?: string | ((seriesName: string) => string | undefined)
}

export interface SingleChartConfig {
  metricName: string
  title: string
  label?: string
  queries: SingleQueryConfig[]
  nullValue?: TransformNullValue
  unit: string
  promAddr?: string
}

// one group has many categories
// one category has many charts
// one chart has many queries (aka promqls)
export interface SinglePanelConfig {
  group: string
  category: string
  displayName?: string
  charts: SingleChartConfig[]
}
