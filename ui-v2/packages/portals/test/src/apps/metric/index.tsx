import {
  AppProvider,
  AzoresHostMetricsPage,
  AzoresOverviewPage,
  MetricsNormalPage,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { Route, Routes } from "react-router-dom"

import { useCtxValue } from "./mock-api-app-provider"

export function MetricsApp() {
  const ctxValue = useCtxValue()
  return (
    <AppProvider ctxValue={ctxValue}>
      <Routes>
        <Route path="/metrics" element={<MetricsNormalPage />} />
        <Route
          path="/metrics-azores-overview"
          element={<AzoresOverviewPage />}
        />
        <Route
          path="/metrics-azores-host"
          element={<AzoresHostMetricsPage />}
        />
      </Routes>
    </AppProvider>
  )
}
