export * from "./ctx"
export * from "./utils/type"

export * from "./pages/normal"
export * from "./pages/azores-overview"
export * from "./pages/azores-overview/chart-card"
export * from "./pages/azores-overview/panel"

export * from "./utils/type"

export type {
  PromResultItem,
  PromResult,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
export { TransformNullValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
export type { SeriesDataType } from "@pingcap-incubator/tidb-dashboard-lib-charts"

import "@pingcap-incubator/tidb-dashboard-lib-charts/dist/style.css"

// i18n
import "./locales"
