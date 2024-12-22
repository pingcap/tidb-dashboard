import { AzoresOverviewMetricsPage } from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { createLazyFileRoute } from "@tanstack/react-router"

import { TanStackRouterUrlStateProvider } from "../../../providers/url-state-provider"

export const Route = createLazyFileRoute(
  "/_apps-layout/metrics/azores-overview",
)({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <TanStackRouterUrlStateProvider>
      <AzoresOverviewMetricsPage />
    </TanStackRouterUrlStateProvider>
  )
}
