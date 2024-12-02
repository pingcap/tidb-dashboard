import { NormalMetricsPage } from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_apps-layout/metrics/normal")({
  component: NormalMetricsPage,
})
