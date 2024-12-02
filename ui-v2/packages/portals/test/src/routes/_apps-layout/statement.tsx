import { AppProvider } from "@pingcap-incubator/tidb-dashboard-lib-apps/statement"
import { Outlet, createFileRoute } from "@tanstack/react-router"

import { useCtxValue } from "../../apps/statement/mock-api-app-provider"

export const Route = createFileRoute("/_apps-layout/statement")({
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
