import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { SimpleGrid } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

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
    <SimpleGrid
      cols={2}
      spacing="xl"
      breakpoints={[{ maxWidth: 980, cols: 1 }]}
    >
      {panelConfig?.charts.map((c) => <ChartCard key={c.title} config={c} />)}
    </SimpleGrid>
  )
}
