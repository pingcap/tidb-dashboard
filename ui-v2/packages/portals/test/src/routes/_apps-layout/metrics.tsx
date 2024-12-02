import { AppProvider as MetricsAppProvider } from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { Outlet, createFileRoute } from "@tanstack/react-router"

import { useCtxValue } from "../../apps/metric/mock-api-app-provider"

export const Route = createFileRoute("/_apps-layout/metrics")({
  component: RouteComponent,
})

function RouteComponent() {
  const ctxValue = useCtxValue()
  return (
    <MetricsAppProvider ctxValue={ctxValue}>
      <Outlet />
    </MetricsAppProvider>
  )
}
