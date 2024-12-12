import {
  useTimeRangeUrlState,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, Card, Group, Typography } from "@tidbcloud/uikit"
import { TimeRangePicker } from "@tidbcloud/uikit/biz"
import dayjs from "dayjs"

import { ChartCard } from "../../components/chart-card"
import { SinglePanelConfig } from "../../utils/type"

const QUICK_RANGES: number[] = [
  5 * 60, // 5 mins
  15 * 60,
  30 * 60,
  60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
  2 * 24 * 60 * 60,
  3 * 24 * 60 * 60, // 3 days
  7 * 24 * 60 * 60, // 7 days
]

// @ts-expect-error @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useLocales() {
  const { tk } = useTn("metric")
  // used for gogocode to scan and generate en.json before build
  tk("panels.performance", "Performance")
  tk("panels.resource", "Resource")
  tk("panels.process", "Process")
}

export function AzoresHostMetricsPanel({
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
          {tk(`panels.${config.category}`)}
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
          <ChartCard key={c.title} config={c} timeRange={timeRange} />
        ))}
      </Box>
    </Card>
  )
}
