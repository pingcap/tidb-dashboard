import {
  TimeRangeValue,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Anchor,
  Box,
  Card,
  Group,
  HoverCard,
  Stack,
  Typography,
} from "@tidbcloud/uikit"
import { IconInfoCircle } from "@tidbcloud/uikit/icons"

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

  // advanced - deprecated
  tk("panels.load_analysis", "Load Analysis")
  tk("panels.sql_tuning", "SQL Tuning")
  tk("panels.optimizer_behavior", "Optimizer Behavior")
  tk("panels.pd_leader", "PD Leader")
  tk("panels.io_env", "IO & Env")
  tk("panels.analyze_statistics", "Analyze Statistics")
  tk("panels.tiflash_related", "TiFlash Related")
  tk("panels.raft_log", "Raft Log")

  // advanced - new
  tk("panels.high_disk_io_usage", "High Disk I/O Usage")
  tk("panels.hotspot", "Hotspot")
  tk("panels.increase_of_rw_latency", "Increased Read and Write Latency")
  tk("panels.lock_conflicts", "Lock Conflicts")
  tk("panels.tidb_oom", "TiDB OOM")
  tk("panels.write_conflicts", "Write Conflicts")

  // deprecated
  tk("panels.throughput", "Throughput")
  tk("panels.host", "Host")
  tk("panels.tidb", "TiDB")
  tk("panels.tikv", "TiKV")
  tk("panels.pd", "PD")
  tk("panels.tiflash", "TiFlash")
}

function useTroubleShootingLinks(): {
  [key: string]: { label: string; link: string }[]
} {
  const { tt } = useTn("metric")
  return {
    high_disk_io_usage: [
      {
        label: tt("Troubleshoot High Disk I/O Usage in TiDB"),
        link: "https://docs.pingcap.com/tidb/stable/troubleshoot-high-disk-io",
      },
    ],
    hotspot: [
      {
        label: tt("Troubleshoot Hotspot Issues"),
        link: "https://docs.pingcap.com/tidb/stable/troubleshoot-hot-spot-issues",
      },
    ],
    increase_of_rw_latency: [
      {
        label: tt("Troubleshoot Increased Read and Write Latency"),
        link: "https://docs.pingcap.com/tidb/stable/troubleshoot-cpu-issues",
      },
    ],
    lock_conflicts: [
      {
        label: tt("Troubleshoot Lock Conflicts"),
        link: "https://docs.pingcap.com/tidb/stable/troubleshoot-lock-conflicts",
      },
      {
        label: tt("Troubleshoot Write Conflicts in Optimistic Transactions"),
        link: "https://docs.pingcap.com/tidb/stable/troubleshoot-write-conflicts",
      },
    ],
    tidb_oom: [
      {
        label: tt("Troubleshoot TiDB OOM Issues"),
        link: "https://docs.pingcap.com/tidb/stable/troubleshoot-tidb-oom",
      },
    ],
    write_conflicts: [
      {
        label: tt("Troubleshoot Lock Conflicts"),
        link: "https://docs.pingcap.com/tidb/stable/troubleshoot-lock-conflicts",
      },
      {
        label: tt("Troubleshoot Write Conflicts in Optimistic Transactions"),
        link: "https://docs.pingcap.com/tidb/stable/troubleshoot-write-conflicts",
      },
    ],
  }
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

  const manuals = useTroubleShootingLinks()[config.category]

  if (visibleCharts.length === 0) {
    return null
  }

  return (
    <Box>
      <Group gap={8}>
        <Typography fw={300} fz={24} mb={8}>
          {tk(`panels.${config.category}`, config.category)}
        </Typography>
        {manuals && (
          <HoverCard position="top" shadow="md" withArrow>
            <HoverCard.Target>
              <Box>
                <IconInfoCircle size={16} strokeWidth={1.5} />
              </Box>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <Stack gap={8}>
                {manuals.map((m) => (
                  <Anchor key={m.label} href={m.link} target="_blank">
                    {m.label}
                  </Anchor>
                ))}
              </Stack>
            </HoverCard.Dropdown>
          </HoverCard>
        )}
      </Group>

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
