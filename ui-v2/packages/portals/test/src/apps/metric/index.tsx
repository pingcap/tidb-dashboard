import {
  AppProvider,
  AzoresHostMetricsPage,
  AzoresOverviewMetricsPage,
  NormalMetricsPage,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { Route, Routes } from "react-router-dom"

import { useCtxValue } from "./mock-api-app-provider"

export function MetricsApp() {
  const ctxValue = useCtxValue()
  return (
    <AppProvider ctxValue={ctxValue}>
      <Routes>
        <Route path="/metrics/normal" element={<NormalMetricsPage />} />
        <Route
          path="/metrics/azores-overview"
          element={<AzoresOverviewMetricsPage />}
        />
        <Route
          path="/metrics/azores-host"
          element={<AzoresHostMetricsPage />}
        />
      </Routes>
    </AppProvider>
  )
}
