import {
  Card,
  Group,
  SegmentedControl,
  SimpleGrid,
  Typography,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import {
  RelativeTimeRange,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo, useState } from "react"

import { SinglePanelConfig } from "../../utils/type"

import { ChartCard } from "./chart-card"

export function AzoresOverviewPanel(props: { config: SinglePanelConfig }) {
  const { tk } = useTn("metric")

  // used for gogocode to scan and generate en.json in build time
  tk("panels.instance_top", "Top 5 Node Utilization")
  tk("panels.host_top", "Top 5 Host Performance")
  tk("panels.cluster_top", "Top 5 SQL Performance")

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
        <Typography variant="title-lg">
          {tk(`panels.${props.config.category}`)}
        </Typography>
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

      <SimpleGrid
        px="md"
        type="container"
        cols={{ base: 1, "900px": 2 }}
        spacing="xl"
      >
        {props.config.charts.map((c) => (
          <ChartCard key={c.title} config={c} timeRange={timeRange} />
        ))}
      </SimpleGrid>
    </Card>
  )
}
