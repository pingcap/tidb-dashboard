import {
  TimeRangeValue,
  toURLTimeRange,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Anchor, Box, Card, Stack } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { ChartBody } from "../../components/chart-body"
import { ChartHeader } from "../../components/chart-header"
import { useAppContext } from "../../ctx"
import { useChartState } from "../../shared-state/memory-state"

import { Filters } from "./filters"

export function AzoresMetricDetailBody() {
  const ctx = useAppContext()
  const selectedChart = useChartState((state) => state.selectedChart)
  const timeRange = useChartState((state) => state.timeRange)
  const setTimeRange = useChartState((state) => state.setTimeRange)
  const selectedInstance = useChartState((state) => state.selectedInstance)
  const { tt } = useTn("metric")

  const diagnosisLinkId = useMemo(() => {
    const { from, to } = toURLTimeRange(timeRange)
    return `${from},${to}`
  }, [timeRange])

  function handleTimeRangeChange(v: TimeRangeValue) {
    setTimeRange({ type: "absolute", value: v })
  }

  if (!selectedChart) {
    return null
  }

  return (
    <Stack gap={"xl"}>
      <Filters />

      <Box miw={800}>
        <Stack>
          <Card p={16} pb={10} bg="carbon.0" shadow="none">
            <ChartHeader title={tt("All Instances")} config={selectedChart}>
              <Anchor
                onClick={() => ctx.actions.openDiagnosis(diagnosisLinkId)}
              >
                {tt("SQL Diagnosis")}
              </Anchor>
            </ChartHeader>
            <ChartBody
              config={selectedChart}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
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
                onTimeRangeChange={handleTimeRangeChange}
                labelValue={`instance="${selectedInstance}"`}
              />
            </Card>
          )}
        </Stack>
      </Box>
    </Stack>
  )
}
