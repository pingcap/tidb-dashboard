import { Stack } from "@tidbcloud/uikit"

import { useMetricQueriesConfigData } from "../../utils/use-data"

import { AzoresHostMetricsPanel } from "./panel"
import { LoadingCard } from "../../components/loading-card"

export function AzoresHostMetricsPage() {
  const { data: panelConfigData, isLoading } =
    useMetricQueriesConfigData("azores-host")

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
          return <AzoresHostMetricsPanel key={panel.category} config={panel} />
        })}
    </Stack>
  )
}
