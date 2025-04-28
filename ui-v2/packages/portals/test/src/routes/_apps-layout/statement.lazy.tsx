import { AppProvider } from "@pingcap-incubator/tidb-dashboard-lib-apps/statement"
import { Outlet, createLazyFileRoute } from "@tanstack/react-router"

import { useCtxValue } from "../../apps/statement/mock-api-app-provider"

export const Route = createLazyFileRoute("/_apps-layout/statement")({
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
