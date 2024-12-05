import { Card, Skeleton, Stack } from "@tidbcloud/uikit"

import { useMetricQueriesConfigData } from "../../utils/use-data"

import { AzoresHostMetricsPanel } from "./panel"

export function AzoresHostMetricsPage() {
  const { data: panelConfigData, isLoading } =
    useMetricQueriesConfigData("azores-host")

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
          return <AzoresHostMetricsPanel key={panel.category} config={panel} />
        })}
    </Stack>
  )
}
