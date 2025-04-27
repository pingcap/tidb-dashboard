import { AppProvider } from "@pingcap-incubator/tidb-dashboard-lib-apps/slow-query"
import { Outlet, createLazyFileRoute } from "@tanstack/react-router"

import { useCtxValue } from "../../apps/slow-query/mock-api-app-provider"

export const Route = createLazyFileRoute("/_apps-layout/slow-query")({
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
