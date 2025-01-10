import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, Card, Group, Typography } from "@tidbcloud/uikit"

import { ChartBody } from "../../components/chart-body"
import { ChartHeader } from "../../components/chart-header"
import { useMetricsUrlState } from "../../shared-state/url-state"
import { SinglePanelConfig } from "../../utils/type"

// @ts-expect-error @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useLocales() {
  const { tk } = useTn("metric")
  // used for gogocode to scan and generate en.json before build
  tk("panels.database_time", "Database Time")
  tk("panels.throughput", "Throughput")
  tk("panels.transaction", "Transaction")
  tk("panels.raft_log", "Raft Log")

  tk("panels.host", "Host")
  tk("panels.tidb", "TiDB")
  tk("panels.tikv", "TiKV")
  tk("panels.pd", "PD")
  tk("panels.tiflash", "TiFlash")

  tk("panels.optimizer_behavior", "Optimizer Behavior")
  tk("panels.sql_tuning", "SQL Tuning")
  tk("panels.io_env", "IO & Env")
  tk("panels.load_analysis", "Load Analysis")
  tk("panels.tiflash_related", "TiFlash Related")
  tk("panels.connection", "Connection")
  tk("panels.pd_leader", "PD Leader")
  tk("panels.analyze_statistics", "Analyze Statistics")
}

export function AzoresClusterMetricsPanel({
  config,
}: {
  config: SinglePanelConfig
}) {
  const { tk } = useTn("metric")
  const { timeRange } = useMetricsUrlState()

  return (
    <Card p={16} bg="carbon.0">
      <Group mb={16}>
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
        {config.charts.map((c, idx) => (
          <Box key={c.title + idx}>
            <ChartHeader
              title={c.title}
              enableDrillDown={true}
              config={c}
              timeRange={timeRange}
            />
            <ChartBody config={c} timeRange={timeRange} />
          </Box>
        ))}
      </Box>
    </Card>
  )
}
