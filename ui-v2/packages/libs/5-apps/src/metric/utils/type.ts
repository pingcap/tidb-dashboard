import { SeriesType } from "@pingcap-incubator/tidb-dashboard-lib-charts"
import { TransformNullValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"

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
  displayName: string
  charts: SingleChartConfig[]
}
