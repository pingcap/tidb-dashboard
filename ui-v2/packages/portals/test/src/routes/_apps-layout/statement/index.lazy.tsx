import { List as StatementListPage } from "@pingcap-incubator/tidb-dashboard-lib-apps/statement"
import { createLazyFileRoute } from "@tanstack/react-router"

import { TanStackRouterUrlStateProvider } from "../../../providers/url-state-provider"

export const Route = createLazyFileRoute("/_apps-layout/statement/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <TanStackRouterUrlStateProvider>
      <StatementListPage />
    </TanStackRouterUrlStateProvider>
  )
}
