import {
  AppProvider,
  AzoresHostMetricsPage,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { Route, Routes } from "react-router-dom"

import { useCtxValue } from "./mock-api-app-provider"

export function MetricsAzoresHostApp() {
  const ctxValue = useCtxValue()
  return (
    <AppProvider ctxValue={ctxValue}>
      <Routes>
        <Route
          path="/metrics-azores-host"
          element={<AzoresHostMetricsPage />}
        />
      </Routes>
    </AppProvider>
  )
}
