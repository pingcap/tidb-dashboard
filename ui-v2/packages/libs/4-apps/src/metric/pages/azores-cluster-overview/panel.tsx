import {
  RelativeTimeRange,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Box,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Typography,
} from "@tidbcloud/uikit"
import { useMemo, useState } from "react"

import { ChartBody } from "../../components/chart-body"
import { ChartHeader } from "../../components/chart-header"
import { SinglePanelConfig } from "../../utils/type"

export function AzoresClusterOverviewMetricsPanel({
  config,
}: {
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
    <Stack gap={8}>
      <Group>
        <Typography variant="title-lg">{tt("Core Metrics")}</Typography>
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
        {config.charts.map((c, idx) => (
          <Card key={c.title + idx} p={16} pb={10} bg="carbon.0" shadow="none">
            <ChartHeader title={c.title} config={c} showMoreActions={true} />
            <ChartBody config={c} timeRange={timeRange} />
          </Card>
        ))}
      </Box>
    </Stack>
  )
}
