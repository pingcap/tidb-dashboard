import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Modal } from "@tidbcloud/uikit"

import { useChartState } from "../../shared-state/memory-state"

import { AzoresMetricDetailBody } from "./body"

export function AzoresMetricDetailModal() {
  const selectedChart = useChartState((state) => state.selectedChart)

  const reset = useChartState((state) => state.reset)
  const { tt } = useTn("metric")

  if (!selectedChart) {
    return null
  }

  return (
    <Modal
      centered={false}
      withinPortal
      overlayProps={{ backgroundOpacity: 0.3 }}
      size="auto"
      title={`${selectedChart.title} ${tt("Drill Down Analysis")}`}
      opened={true}
      onClose={reset}
    >
      <AzoresMetricDetailBody />
    </Modal>
  )
}
