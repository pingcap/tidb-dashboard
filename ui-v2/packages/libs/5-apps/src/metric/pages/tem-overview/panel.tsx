import {
  Group,
  SegmentedControl,
  SimpleGrid,
  Typography,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { Card } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { SinglePanelConfig } from "../../utils/type"

import { ChartCard } from "./chart-card"

export function TemOverviewPanel(props: { config: SinglePanelConfig }) {
  return (
    <Card p={16} bg="carbon.0" shadow="none">
      <Group>
        <Typography variant="title-md">{props.config.displayName}</Typography>
        <Group ml="auto">
          <SegmentedControl data={["1h", "24h", "7d"]} />
        </Group>
      </Group>

      <SimpleGrid
        cols={2}
        spacing="xl"
        breakpoints={[{ maxWidth: 980, cols: 1 }]}
      >
        {props.config.charts.map((c) => (
          <ChartCard key={c.title} config={c} />
        ))}
      </SimpleGrid>
    </Card>
  )
}
