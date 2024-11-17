import {
  AppProvider,
  AzoresOverviewPage,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { Route, Routes } from "react-router-dom"

import { useCtxValue } from "./mock-api-app-provider"

export function MetricsAzoresOverviewApp() {
  const ctxValue = useCtxValue()
  return (
    <AppProvider ctxValue={ctxValue}>
      <Routes>
        <Route
          path="/metrics-azores-overview"
          element={<AzoresOverviewPage />}
        />
      </Routes>
    </AppProvider>
  )
}
