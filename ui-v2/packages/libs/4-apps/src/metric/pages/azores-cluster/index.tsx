import { Card, Skeleton, Stack } from "@tidbcloud/uikit"

import { useMetricsUrlState } from "../../url-state"
import { useMetricQueriesConfigData } from "../../utils/use-data"

import { Filters } from "./filters"
import { AzoresClusterMetricsPanel } from "./panel"

export function AzoresClusterMetricsPage() {
  const { panel } = useMetricsUrlState()
  const { data: panelConfigData, isLoading } =
    useMetricQueriesConfigData("azores-cluster")

  const filteredPanelConfigData = panelConfigData?.filter(
    (p) => p.group === (panel || "basic"),
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
      <Filters />

      {filteredPanelConfigData
        ?.filter((p) => p.charts.length > 0)
        .map((panel) => {
          return (
            <AzoresClusterMetricsPanel key={panel.category} config={panel} />
          )
        })}
    </Stack>
  )
}
