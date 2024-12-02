import { AzoresHostMetricsPage } from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { createLazyFileRoute } from "@tanstack/react-router"

export const Route = createLazyFileRoute("/_apps-layout/metrics/azores-host")({
  component: AzoresHostMetricsPage,
})
