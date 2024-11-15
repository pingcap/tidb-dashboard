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

import { SingleChartConfig } from "../utils/type"
import { useMetricData } from "../utils/use-data"

export function ChartCard({ config }: { config: SingleChartConfig }) {
  const { data, loading } = useMetricData(config, 0, 0, 10)

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

      {loading && (
        <Flex h={200} align="center" justify="center">
          <Loader size="xs" />
        </Flex>
      )}

      {!loading && data.length > 0 && (
        <Box h={200}>
          <SeriesChart unit={config.unit} data={data} />
        </Box>
      )}

      {!loading && data.length === 0 && (
        <Flex h={200} align="center" justify="center">
          <Typography variant="body-md">No data</Typography>
        </Flex>
      )}
    </Card>
  )
}
