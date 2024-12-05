import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { SimpleGrid } from "@tidbcloud/uikit"

import { useMetricsUrlState } from "../../url-state"
import { useMetricQueriesConfigData } from "../../utils/use-data"

import { ChartCard } from "./chart-card"

export function Panel() {
  const { panel } = useMetricsUrlState()
  const { data: panelConfigData, isLoading } =
    useMetricQueriesConfigData("normal")
  const panelConfig =
    panelConfigData?.find((p) => p.category === panel) || panelConfigData?.[0]

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <SimpleGrid type="container" cols={{ base: 1, "900px": 2 }} spacing="xl">
      {panelConfig?.charts.map((c) => <ChartCard key={c.title} config={c} />)}
    </SimpleGrid>
  )
}
