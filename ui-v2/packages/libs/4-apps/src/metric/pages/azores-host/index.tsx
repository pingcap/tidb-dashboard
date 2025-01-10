import { Stack } from "@tidbcloud/uikit"

import { LoadingCard } from "../../components/loading-card"
import { useMetricQueriesConfigData } from "../../utils/use-data"

import { Filters } from "./filters"
import { AzoresHostMetricsPanel } from "./panel"

export function AzoresHostMetricsPage() {
  const { data: panelConfigData, isLoading } =
    useMetricQueriesConfigData("azores-host")

  if (isLoading) {
    return <LoadingCard />
  }

  return (
    <Stack>
      <Filters />

      {panelConfigData
        ?.filter((p) => p.charts.length > 0)
        .map((panel) => {
          return <AzoresHostMetricsPanel key={panel.category} config={panel} />
        })}
    </Stack>
  )
}
