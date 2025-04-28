import { ActionDrawer } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"

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
    <ActionDrawer
      position="right"
      withinPortal
      size="auto"
      title={`${selectedChart.title} ${tt("Drill Down Analysis")}`}
      opened={true}
      onClose={reset}
    >
      <ActionDrawer.Body>
        <AzoresMetricDetailBody />
      </ActionDrawer.Body>
    </ActionDrawer>
  )
}
