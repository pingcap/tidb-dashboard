import { RelativeTimeRange } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  Group,
  SegmentedControl,
  SimpleGrid,
  Typography,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { Card } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo, useState } from "react"

import { SinglePanelConfig } from "../../utils/type"

import { ChartCard } from "./chart-card"

export function AzoresOverviewPanel(props: { config: SinglePanelConfig }) {
  const { tn } = useTn()

  const timeRangeOptions = useMemo(() => {
    return [
      { label: tn("common.hour", "1 hr", { count: 1 }), value: 60 * 60 + "" },
      {
        label: tn("common.hour", "24 hrs", { count: 24 }),
        value: 24 * 60 * 60 + "",
      },
      {
        label: tn("common.day", "7 days", { count: 7 }),
        value: 7 * 24 * 60 * 60 + "",
      },
    ]
  }, [tn])
  const [timeRange, setTimeRange] = useState<RelativeTimeRange>({
    type: "relative",
    value: parseInt(timeRangeOptions[0].value),
  })

  return (
    <Card p={24} bg="carbon.0">
      <Group mb={20}>
        <Typography variant="title-lg">
          {tn(`o11ylib.metric.${props.config.category}.title`)}
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
