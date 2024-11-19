import { SeriesDataType } from "@pingcap-incubator/tidb-dashboard-lib-charts"
import { TransformNullValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"

export interface SingleQueryConfig {
  promql: string
  legendName: string
  type: SeriesDataType
  color?: string | ((seriesName: string) => string | undefined)
  // lineSeriesStyle?: RecursivePartial<LineSeriesStyle>
}

export interface SingleChartConfig {
  metricName: string
  title: string
  label?: string
  queries: SingleQueryConfig[]
  nullValue?: TransformNullValue
  unit: string
  // yAxisFormat?: TickFormatter<any>
}

export interface SinglePanelConfig {
  category: string
  displayName: string
  charts: SingleChartConfig[]
}
