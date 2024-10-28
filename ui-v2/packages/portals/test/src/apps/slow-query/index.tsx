import {
  AppProvider,
  Detail,
  List,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/slow-query"
import { Route, Routes } from "react-router-dom"

import { useCtxValue } from "./mock-api-app-provider"

export function SlowQueryApp() {
  const ctxValue = useCtxValue()
  return (
    <AppProvider ctxValue={ctxValue}>
      <Routes>
        <Route path="/slow-query/list" element={<List />} />
        <Route path="/slow-query/detail" element={<Detail />} />
      </Routes>
    </AppProvider>
  )
}
