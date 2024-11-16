import {
  AppProvider,
  TemOverviewPage,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { Route, Routes } from "react-router-dom"

import { useCtxValue } from "./mock-api-app-provider"

export function MetricsTemOverviewApp() {
  const ctxValue = useCtxValue()
  return (
    <AppProvider ctxValue={ctxValue}>
      <Routes>
        <Route path="/metrics-tem-overview" element={<TemOverviewPage />} />
      </Routes>
    </AppProvider>
  )
}
