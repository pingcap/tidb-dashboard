import {
  KIBANA_METRICS,
  SeriesChart,
} from "@pingcap-incubator/tidb-dashboard-lib-charts"
import {
  Card,
  Group,
  Typography,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { SingleChartConfig } from "../utils/type"

export function ChartCard({ config }: { config: SingleChartConfig }) {
  return (
    <Card p={16} bg="carbon.0" shadow="none">
      <Group mb="xs" spacing={0} sx={{ justifyContent: "center" }}>
        <Typography variant="title-md">{config.title}</Typography>
      </Group>
      <SeriesChart
        data={[
          {
            data: KIBANA_METRICS.metrics.kibana_os_load.v1.data,
            id: "kibana_os_load",
            name: "kibana_os_load",
            type: "line",
          },
        ]}
      />
    </Card>
  )
}
