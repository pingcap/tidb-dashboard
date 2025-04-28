import { List as SlowQueryListPage } from "@pingcap-incubator/tidb-dashboard-lib-apps/slow-query"
import { createLazyFileRoute } from "@tanstack/react-router"

import { TanStackRouterUrlStateProvider } from "../../../providers/url-state-provider"

export const Route = createLazyFileRoute("/_apps-layout/slow-query/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <TanStackRouterUrlStateProvider>
      <SlowQueryListPage />
    </TanStackRouterUrlStateProvider>
  )
}
