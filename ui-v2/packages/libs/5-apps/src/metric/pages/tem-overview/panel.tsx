import { RelativeTimeRange } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  Group,
  SegmentedControl,
  SimpleGrid,
  Typography,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { Card } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useState } from "react"

import { SinglePanelConfig } from "../../utils/type"

import { ChartCard } from "./chart-card"

const timeRangeOptions: {
  label: string
  value: string
  tr: RelativeTimeRange
}[] = [
  {
    label: "1 hr",
    value: "1h",
    tr: { type: "relative", value: 60 * 60 },
  },
  {
    label: "24 hrs",
    value: "24h",
    tr: { type: "relative", value: 24 * 60 * 60 },
  },
  {
    label: "7 days",
    value: "7d",
    tr: { type: "relative", value: 7 * 24 * 60 * 60 },
  },
]

export function TemOverviewPanel(props: { config: SinglePanelConfig }) {
  const [timeRange, setTimeRange] = useState<RelativeTimeRange>(
    timeRangeOptions[0].tr,
  )

  return (
    <Card p={24} bg="carbon.0" shadow="none">
      <Group mb={20}>
        <Typography variant="title-lg">{props.config.displayName}</Typography>
        <Group ml="auto">
          <SegmentedControl
            data={timeRangeOptions}
            onChange={(v) => {
              setTimeRange(timeRangeOptions.find((t) => t.value === v)!.tr)
            }}
          />
        </Group>
      </Group>

      <SimpleGrid
        px="md"
        type="container"
        cols={{ base: 1, "500px": 2 }}
        // cols={2}
        spacing="xl"
        // breakpoints={[{ maxWidth: 980, cols: 1 }]}
      >
        {props.config.charts.map((c) => (
          <ChartCard key={c.title} config={c} timeRange={timeRange} />
        ))}
      </SimpleGrid>
    </Card>
  )
}
