import { SimpleGrid } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { useAppContext } from "../ctx"
import { useMetricsUrlState } from "../url-state"

import { ChartCard } from "./chart-card"

export function Panel() {
  const ctx = useAppContext()
  const { panel } = useMetricsUrlState()

  const panelConfig = ctx.cfg.metricQueriesConfig.find(
    (p) => p.category === panel,
  )

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
