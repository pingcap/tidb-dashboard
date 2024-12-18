import { List as SlowQueryListPage } from "@pingcap-incubator/tidb-dashboard-lib-apps/slow-query"
import { createLazyFileRoute } from "@tanstack/react-router"

export const Route = createLazyFileRoute("/_apps-layout/slow-query/")({
  component: SlowQueryListPage,
})
