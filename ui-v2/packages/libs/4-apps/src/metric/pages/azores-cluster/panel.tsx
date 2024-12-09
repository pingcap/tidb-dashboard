import {
  useTimeRangeUrlState,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, Card, Group, Typography } from "@tidbcloud/uikit"

import { ChartCard } from "../../components/chart-card"
import { SinglePanelConfig } from "../../utils/type"

export function AzoresClusterMetricsPanel({
  config,
}: {
  config: SinglePanelConfig
}) {
  const { tk } = useTn("metric")

  // used for gogocode to scan and generate en.json in build time
  tk("panels.database_time", "Database Time")
  tk("panels.throughput", "Throughput")
  tk("panels.transaction", "Transaction")
  tk("panels.raft_log", "Raft Log")

  tk("panels.tidb", "TiDB")
  tk("panels.tikv", "TiKV")
  tk("panels.pd", "PD")
  tk("panels.tiflash", "TiFlash")

  const { timeRange } = useTimeRangeUrlState()

  return (
    <Card p={24} bg="carbon.0">
      <Group mb={20}>
        <Typography variant="title-lg">
          {tk(`panels.${config.category}`, config.category)}
        </Typography>
      </Group>

      <Box
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
        }}
      >
        {config.charts.map((c) => (
          <ChartCard key={c.title} config={c} timeRange={timeRange} />
        ))}
      </Box>
    </Card>
  )
}
