import { Stack } from "@tidbcloud/uikit"

import { useMetricQueriesConfigData } from "../../utils/use-data"

import { AzoresClusterOverviewMetricsPanel } from "./panel"
import { LoadingCard } from "../../components/loading-card"

export function AzoresClusterOverviewMetricsPage() {
  const { data: panelConfigData, isLoading } = useMetricQueriesConfigData(
    "azores-cluster-overview",
  )

  if (isLoading) {
    return (
      <LoadingCard />
    )
  }

  return (
    <Stack>
      {panelConfigData
        ?.filter((p) => p.charts.length > 0)
        .map((panel) => {
          return (
            <AzoresClusterOverviewMetricsPanel
              key={panel.category}
              config={panel}
            />
          )
        })}
    </Stack>
  )
}
