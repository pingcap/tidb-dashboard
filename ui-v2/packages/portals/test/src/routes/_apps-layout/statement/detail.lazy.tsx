import { Detail as StatementDetailPage } from "@pingcap-incubator/tidb-dashboard-lib-apps/statement"
import { createLazyFileRoute } from "@tanstack/react-router"

import { TanStackRouterUrlStateProvider } from "../../../providers/url-state-provider"

export const Route = createLazyFileRoute("/_apps-layout/statement/detail")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <TanStackRouterUrlStateProvider>
      <StatementDetailPage />
    </TanStackRouterUrlStateProvider>
  )
}
