import {
  IndexAdvisorProvider,
  List,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/index-advisor"
import { Route, Routes } from "react-router-dom"

import { getIndexAdvisorContext } from "./mock-api-app-provider"

const ctxValue = getIndexAdvisorContext()

export function IndexAdvisorApp() {
  return (
    <IndexAdvisorProvider ctxValue={ctxValue}>
      <Routes>
        <Route path="/index-advisor/list" element={<List />} />
      </Routes>
    </IndexAdvisorProvider>
  )
}
