import { Stack } from "@tidbcloud/uikit"

import { LoadingCard } from "../../components/loading-card"
import { useCurPanelConfigsData } from "../../utils/use-data"
import { AzoresMetricModal } from "../azores-metric-modal"

import { Filters } from "./filters"
import { AzoresClusterMetricsPanel } from "./panel"

export function AzoresClusterMetricsPage() {
  const { panelConfigData, isLoading } = useCurPanelConfigsData()

  if (isLoading) {
    return <LoadingCard />
  }

  return (
    <Stack>
      <Filters />

      {panelConfigData
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
