import { AppProvider } from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { Outlet, createLazyFileRoute } from "@tanstack/react-router"

import { useCtxValue } from "../../apps/metric/mock-api-app-provider"

export const Route = createLazyFileRoute("/_apps-layout/metrics")({
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
