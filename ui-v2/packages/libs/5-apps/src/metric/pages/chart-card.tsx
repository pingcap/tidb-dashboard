import { toTimeRangeValue } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  // KIBANA_METRICS,
  SeriesChart,
} from "@pingcap-incubator/tidb-dashboard-lib-charts"
import {
  Box,
  Card,
  Flex,
  Group,
  Loader,
  Typography,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useMetricsUrlState } from "../url-state"
import { SingleChartConfig } from "../utils/type"
import { calcStep, useMetricData } from "../utils/use-data"

export function ChartCard({ config }: { config: SingleChartConfig }) {
  const { timeRange, refresh } = useMetricsUrlState()
  const tr = useMemo(() => toTimeRangeValue(timeRange), [timeRange])

  const [step, setStep] = useState(0)
  const chartRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        // 140 is the width of the chart legend
        setStep(calcStep(tr, node.offsetWidth - 140))
      }
    },
    [tr],
  )

  const { data, loading, refetchAll } = useMetricData(config, timeRange, step)

  useEffect(() => {
    if (refresh !== "") {
      refetchAll()
    }
  }, [refresh])

  return (
    <Card p={16} bg="carbon.0" shadow="none">
      <Group mb="xs" spacing={0} sx={{ justifyContent: "center" }}>
        <Typography variant="title-md">{config.title}</Typography>
      </Group>

      {/* <SeriesChart
        unit={config.unit}
        data={[
          {
            data: KIBANA_METRICS.metrics.kibana_os_load.v1.data,
            id: "kibana_os_load",
            name: "kibana_os_load",
            type: "line",
          },
        ]}
      /> */}

      <Box h={200} ref={chartRef}>
        {loading ? (
          <Flex h={200} align="center" justify="center">
            <Loader size="xs" />
          </Flex>
        ) : (
          <SeriesChart unit={config.unit} data={data} timeRange={tr} />
        )}
      </Box>
    </Card>
  )
}
