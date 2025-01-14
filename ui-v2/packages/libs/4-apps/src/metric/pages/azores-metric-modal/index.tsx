import {
  toURLTimeRange,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Anchor, Box, Card, Modal, Stack } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { ChartBody } from "../../components/chart-body"
import { ChartHeader } from "../../components/chart-header"
import { useAppContext } from "../../ctx"
import { useChartState } from "../../shared-state/memory-state"

import { Filters } from "./filters"

export function AzoresMetricModal() {
  const ctx = useAppContext()
  const selectedChart = useChartState((state) => state.selectedChart)
  const timeRange = useChartState((state) => state.timeRange)
  const selectedInstance = useChartState((state) => state.selectedInstance)
  const reset = useChartState((state) => state.reset)
  const { tt } = useTn("metric")

  const diagnosisLinkId = useMemo(() => {
    const { from, to } = toURLTimeRange(timeRange)
    return `${from},${to}`
  }, [timeRange])

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
      <Stack gap={"xl"}>
        <Filters />

        <Box miw={800}>
          <Stack>
            <Card p={16} pb={10} bg="carbon.0" shadow="none">
              <ChartHeader title="All Instances" config={selectedChart}>
                <Anchor
                  onClick={() => ctx.actions.openDiagnosis(diagnosisLinkId)}
                >
                  {tt("SQL Diagnosis")}
                </Anchor>
              </ChartHeader>
              <ChartBody config={selectedChart} timeRange={timeRange} />
            </Card>

            {selectedInstance && (
              <Card p={16} pb={10} bg="carbon.0" shadow="none">
                <ChartHeader title={selectedInstance} config={selectedChart}>
                  <Anchor
                    onClick={() =>
                      ctx.actions.openHostMonitoring(selectedInstance)
                    }
                  >
                    {tt("Host Monitoring")}
                  </Anchor>
                </ChartHeader>
                <ChartBody
                  config={selectedChart}
                  timeRange={timeRange}
                  labelValue={`instance="${selectedInstance}"`}
                />
              </Card>
            )}
          </Stack>
        </Box>
      </Stack>
    </Modal>
  )
}
