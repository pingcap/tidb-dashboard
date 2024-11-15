import {
  // KIBANA_METRICS,
  SeriesChart,
} from "@pingcap-incubator/tidb-dashboard-lib-charts"
import {
  Box,
  Card,
  Group,
  Typography,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { SingleChartConfig } from "../utils/type"
import { useMetricData } from "../utils/use-data"

export function ChartCard({ config }: { config: SingleChartConfig }) {
  const { data } = useMetricData(config, 0, 0, 10)

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

      <Box h={200}>
        <SeriesChart unit={config.unit} data={data} />
      </Box>
    </Card>
  )
}
