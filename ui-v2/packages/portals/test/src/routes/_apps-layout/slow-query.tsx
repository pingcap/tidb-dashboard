import { AppProvider } from "@pingcap-incubator/tidb-dashboard-lib-apps/slow-query"
import { Outlet, createFileRoute } from "@tanstack/react-router"

import { useCtxValue } from "../../apps/slow-query/mock-api-app-provider"

export const Route = createFileRoute("/_apps-layout/slow-query")({
  component: RouteComponent,
})

function RouteComponent() {
  const ctxValue = useCtxValue()
  return (
    <AppProvider ctxValue={ctxValue}>
      <Outlet />
    </AppProvider>
  )
}
