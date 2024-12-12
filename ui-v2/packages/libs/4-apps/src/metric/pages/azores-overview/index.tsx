import { Stack } from "@tidbcloud/uikit"

import { useMetricQueriesConfigData } from "../../utils/use-data"

import { AzoresOverviewMetricsPanel } from "./panel"
import { LoadingCard } from "../../components/loading-card"

export function AzoresOverviewMetricsPage() {
  const { data: panelConfigData, isLoading } =
    useMetricQueriesConfigData("azores-overview")

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
            <AzoresOverviewMetricsPanel key={panel.category} config={panel} />
          )
        })}
    </Stack>
  )
}
