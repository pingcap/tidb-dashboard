import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { PieChart } from "@pingcap-incubator/tidb-dashboard-lib-charts"
import {
  Box,
  Card,
  Group,
  SimpleGrid,
  Typography,
  useComputedColorScheme,
} from "@tidbcloud/uikit"

import { useMetricsUrlState } from "../../shared-state/url-state"
import { useMetricQueriesConfigData } from "../../utils/use-data"

import { ChartCard } from "./chart-card"

export function Panel() {
  const { panel } = useMetricsUrlState()
  const { data: panelConfigData, isLoading } =
    useMetricQueriesConfigData("normal")
  const panelConfig =
    panelConfigData?.find((p) => p.category === panel) || panelConfigData?.[0]

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <SimpleGrid type="container" cols={{ base: 1, "900px": 2 }} spacing="xl">
      {panelConfig?.charts.map((c) => <ChartCard key={c.title} config={c} />)}

      <PieChartCard />
    </SimpleGrid>
  )
}

function PieChartCard() {
  const colorScheme = useComputedColorScheme()
  return (
    <Card p={16} bg="carbon.0" shadow="none">
      <Group mb="xs" gap={0} sx={{ justifyContent: "center" }}>
        <Typography variant="title-md">Pie Chart Demo</Typography>
      </Group>
      <Box h={200}>
        <PieChart
          data={[
            { name: "banana", value: 10000 },
            { name: "apple", value: 2000 },
            {
              name: "orange",
              value: 3000,
            },
          ]}
          theme={colorScheme}
          unit="short"
        />
      </Box>
    </Card>
  )
}
