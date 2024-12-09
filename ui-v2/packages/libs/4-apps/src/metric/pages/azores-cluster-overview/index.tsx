import { Card, Skeleton, Stack } from "@tidbcloud/uikit"

import { useMetricQueriesConfigData } from "../../utils/use-data"

import { AzoresClusterOverviewMetricsPanel } from "./panel"

export function AzoresClusterOverviewMetricsPage() {
  const { data: panelConfigData, isLoading } = useMetricQueriesConfigData(
    "azores-cluster-overview",
  )

  if (isLoading) {
    return (
      <Card p={24} bg="carbon.0">
        <Skeleton visible={true} h={290} />
      </Card>
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
