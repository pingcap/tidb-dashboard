import {
  TimeRangeValue,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, Card, Typography } from "@tidbcloud/uikit"

import { ChartBody } from "../../components/chart-body"
import { ChartHeader } from "../../components/chart-header"
import { useChartsSelectState } from "../../shared-state/memory-state"
import { useMetricsUrlState } from "../../shared-state/url-state"
import { SinglePanelConfig } from "../../utils/type"

// @ts-expect-error @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useLocales() {
  const { tk } = useTn("metric")
  // used for gogocode to scan and generate en.json before build
  // basic
  tk("panels.database_time", "Database Time")
  tk("panels.connections", "Connections")
  tk("panels.sql_load_profile", "SQL Load Profile")
  tk("panels.top_down_duration", "Top-down Duration")
  tk("panels.transaction", "Transaction")
  tk("panels.tidb_components_resource", "TiDB Componets Resource")
  tk("panels.hosts_resource", "Hosts Resource")

  // advanced
  tk("panels.load_analysis", "Load Analysis")
  tk("panels.sql_tuning", "SQL Tuning")
  tk("panels.optimizer_behavior", "Optimizer Behavior")
  tk("panels.pd_leader", "PD Leader")
  tk("panels.io_env", "IO & Env")
  tk("panels.analyze_statistics", "Analyze Statistics")
  tk("panels.tiflash_related", "TiFlash Related")
  tk("panels.raft_log", "Raft Log")

  // deprecated
  tk("panels.throughput", "Throughput")
  tk("panels.host", "Host")
  tk("panels.tidb", "TiDB")
  tk("panels.tikv", "TiKV")
  tk("panels.pd", "PD")
  tk("panels.tiflash", "TiFlash")
}

export function AzoresClusterMetricsPanel({
  config,
}: {
  config: SinglePanelConfig
}) {
  const { tk } = useTn("metric")
  const { timeRange, setTimeRange } = useMetricsUrlState()
  const hiddenCharts = useChartsSelectState((s) => s.hiddenCharts)

  const visibleCharts = config.charts.filter((c) => {
    return !hiddenCharts.includes(c.metricName)
  })

  function handleTimeRangeChange(v: TimeRangeValue) {
    setTimeRange({ type: "absolute", value: v })
  }

  if (visibleCharts.length === 0) {
    return null
  }

  return (
    <Box>
      <Typography fw={300} fz={24} mb={8}>
        {tk(`panels.${config.category}`, config.category)}
      </Typography>

      <Box
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
        }}
      >
        {visibleCharts.map((c, idx) => (
          <Card key={c.title + idx} p={16} pb={10} bg="carbon.0" shadow="none">
            <ChartHeader
              title={c.title}
              enableDrillDown={true}
              showMoreActions={true}
              config={c}
              timeRange={timeRange}
            />
            <ChartBody
              config={c}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
          </Card>
        ))}
      </Box>
    </Box>
  )
}
