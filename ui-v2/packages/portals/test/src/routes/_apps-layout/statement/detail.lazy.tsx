import { Detail as StatementDetailPage } from "@pingcap-incubator/tidb-dashboard-lib-apps/statement"
import { createLazyFileRoute } from "@tanstack/react-router"

export const Route = createLazyFileRoute("/_apps-layout/statement/detail")({
  component: StatementDetailPage,
})
