import {
  AppProvider,
  Detail,
  List,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/statement"
import { Route, Routes } from "react-router-dom"

import { useCtxValue } from "./mock-api-app-provider"

export function StatementApp() {
  const ctxValue = useCtxValue()
  return (
    <AppProvider ctxValue={ctxValue}>
      <Routes>
        <Route path="/statement/list" element={<List />} />
        <Route path="/statement/detail" element={<Detail />} />
      </Routes>
    </AppProvider>
  )
}
