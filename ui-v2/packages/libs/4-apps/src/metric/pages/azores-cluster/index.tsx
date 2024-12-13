import { Stack } from "@tidbcloud/uikit"

import { LoadingCard } from "../../components/loading-card"
import { useMetricsUrlState } from "../../shared-state/url-state"
import { useMetricQueriesConfigData } from "../../utils/use-data"
import { AzoresMetricModal } from "../azores-metric-modal"

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
    return <LoadingCard />
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

      {/* notice: don't put `AzoresMetricModal` in the panel component, all panels should share one modal */}
      <AzoresMetricModal />
    </Stack>
  )
}
