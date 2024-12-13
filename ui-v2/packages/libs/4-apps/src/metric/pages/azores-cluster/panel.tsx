import {
  useTimeRangeUrlState,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, Card, Group, Typography } from "@tidbcloud/uikit"
import { TimeRangePicker } from "@tidbcloud/uikit/biz"
import dayjs from "dayjs"

import { ChartCard } from "../../components/chart-card"
import { QUICK_RANGES } from "../../utils/constants"
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
  const { timeRange, setTimeRange } = useTimeRangeUrlState()

  const timeRangePicker = (
    <TimeRangePicker
      value={timeRange}
      onChange={(v) => {
        setTimeRange(v)
      }}
      quickRanges={QUICK_RANGES}
      minDateTime={() =>
        dayjs()
          .subtract(QUICK_RANGES[QUICK_RANGES.length - 1], "seconds")
          .toDate()
      }
      maxDateTime={() => dayjs().toDate()}
    />
  )

  return (
    <Card p={16} bg="carbon.0">
      <Group mb={16}>
        <Typography variant="title-lg">
          {tk(`panels.${config.category}`, config.category)}
        </Typography>
        <Group ml="auto">{timeRangePicker}</Group>
      </Group>

      <Box
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
        }}
      >
        {config.charts.map((c) => (
          <ChartCard
            key={c.title}
            config={c}
            timeRange={timeRange}
            enableDrillDown={true}
          />
        ))}
      </Box>
    </Card>
  )
}
