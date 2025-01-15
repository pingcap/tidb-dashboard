import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Drawer } from "@tidbcloud/uikit"

import { useChartState } from "../../shared-state/memory-state"

import { AzoresMetricDetailBody } from "./body"

export function AzoresMetricDetailDrawer() {
  const selectedChart = useChartState((state) => state.selectedChart)

  const reset = useChartState((state) => state.reset)
  const { tt } = useTn("metric")

  if (!selectedChart) {
    return null
  }

  return (
    <Drawer
      position="right"
      withinPortal
      overlayProps={{ backgroundOpacity: 0.3 }}
      size="auto"
      title={`${selectedChart.title} ${tt("Drill Down Analysis")}`}
      opened={true}
      onClose={reset}
    >
      <AzoresMetricDetailBody />
    </Drawer>
  )
}
