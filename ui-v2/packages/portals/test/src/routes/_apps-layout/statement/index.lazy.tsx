import { List as StatementListPage } from "@pingcap-incubator/tidb-dashboard-lib-apps/statement"
import { createLazyFileRoute } from "@tanstack/react-router"

export const Route = createLazyFileRoute("/_apps-layout/statement/")({
  component: StatementListPage,
})
