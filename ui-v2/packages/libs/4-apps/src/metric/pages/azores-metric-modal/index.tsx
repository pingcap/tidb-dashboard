import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, Modal, Stack } from "@tidbcloud/uikit"

import { ChartCard } from "../../components/chart-card"
import { useChartState } from "../../shared-state/memory-state"

import { Filters } from "./filters"

export function AzoresMetricModal() {
  const selectedChart = useChartState((state) => state.selectedChart)
  const timeRange = useChartState((state) => state.timeRange)
  const selectedLabelValue = useChartState((state) => state.selectedLabelValue)
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
      title={`${selectedChart.title} ${tt("Drill Down")}`}
      opened={true}
      onClose={reset}
    >
      <Stack gap={"xl"}>
        <Filters />

        <Box miw={800}>
          <ChartCard
            config={selectedChart}
            timeRange={timeRange}
            labelValue={selectedLabelValue}
            hideTitle
          />
        </Box>
      </Stack>
    </Modal>
  )
}
