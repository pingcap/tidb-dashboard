import {
  RelativeTimeRange,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Box,
  Card,
  Group,
  SegmentedControl,
  Typography,
} from "@tidbcloud/uikit"
import { useMemo, useState } from "react"

import { ChartCard } from "../../components/chart-card"
import { SinglePanelConfig } from "../../utils/type"

export function AzoresClusterOverviewMetricsPanel(props: {
  config: SinglePanelConfig
}) {
  const { tk, tt } = useTn("metric")

  const timeRangeOptions = useMemo(() => {
    return [
      {
        label: tk("time_range.hour", "{{count}} hr", { count: 1 }),
        value: 60 * 60 + "",
      },
      {
        label: tk("time_range.hour", "{{count}} hrs", { count: 24 }),
        value: 24 * 60 * 60 + "",
      },
      {
        label: tk("time_range.day", "{{count}} days", { count: 7 }),
        value: 7 * 24 * 60 * 60 + "",
      },
    ]
  }, [tk])
  const [timeRange, setTimeRange] = useState<RelativeTimeRange>({
    type: "relative",
    value: parseInt(timeRangeOptions[0].value),
  })

  return (
    <Card p={24} bg="carbon.0">
      <Group mb={20}>
        <Typography variant="title-lg">{tt("Metrics")}</Typography>
        <Group ml="auto">
          <SegmentedControl
            size="xs"
            withItemsBorders={false}
            data={timeRangeOptions}
            onChange={(v) => {
              setTimeRange({ type: "relative", value: parseInt(v) })
            }}
          />
        </Group>
      </Group>

      <Box
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
        }}
      >
        {props.config.charts.map((c) => (
          <ChartCard key={c.title} config={c} timeRange={timeRange} />
        ))}
      </Box>
    </Card>
  )
}
