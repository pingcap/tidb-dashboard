import {
  RelativeTimeRange,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Box,
  Card,
  Group,
  SegmentedControl,
  Tooltip,
  Typography,
} from "@tidbcloud/uikit"
import { IconInfoCircle } from "@tidbcloud/uikit/icons"
import { useMemo, useState } from "react"

import { ChartBody } from "../../components/chart-body"
import { ChartHeader } from "../../components/chart-header"
import { SinglePanelConfig } from "../../utils/type"
import { useMetricConfigData } from "../../utils/use-data"

// @ts-expect-error @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useLocales() {
  const { tk } = useTn("metric")
  // used for gogocode to scan and generate en.json before build
  tk("panels.instance_top", "Top 5 Node Utilization")
  tk("panels.host_top", "Top 5 Host Performance")
  tk("panels.cluster_top", "Top 5 SQL Performance")
}

export function AzoresOverviewMetricsPanel({
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
  const { data: metricConfigData } = useMetricConfigData()

  return (
    <Card p={24} bg="carbon.0">
      <Group mb={16} gap="xs">
        <Typography variant="title-lg">
          {tk(`panels.${config.category}`)}
        </Typography>
        <Tooltip
          label={tt("The rank may have a delay of up to {{n}} minutes", {
            n: Math.ceil((metricConfigData?.delaySec || 0) / 60),
          })}
          disabled={!metricConfigData?.delaySec}
        >
          <IconInfoCircle />
        </Tooltip>
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
          <Box key={c.title + idx}>
            <ChartHeader title={c.title} config={c} />
            <ChartBody config={c} timeRange={timeRange} />
          </Box>
        ))}
      </Box>
    </Card>
  )
}
