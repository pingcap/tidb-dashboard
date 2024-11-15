import {
  Card,
  Group,
  Typography,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { MetricChart } from "../components/chart"
import { SingleChartConfig } from "../utils/type"

export function ChartCard({ config }: { config: SingleChartConfig }) {
  return (
    <Card p={16} bg="carbon.0" shadow="none">
      <Group mb="xs" spacing={0} sx={{ justifyContent: "center" }}>
        <Typography variant="title-md">{config.title}</Typography>
      </Group>
      <MetricChart />
    </Card>
  )
}
