import {
  Card,
  Skeleton,
  Stack,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { useMetricQueriesConfigData } from "../../utils/use-data"

import { AzoresOverviewMetricsPanel } from "./panel"

export function AzoresOverviewMetricsPage() {
  const { data: panelConfigData, isLoading } =
    useMetricQueriesConfigData("azores-overview")

  if (isLoading) {
    return (
      <Card p={24} bg="carbon.0">
        <Skeleton visible={true} h={290} />
      </Card>
    )
  }

  return (
    <Stack>
      {panelConfigData
        ?.filter((p) => p.charts.length > 0)
        .map((panel) => {
          return (
            <AzoresOverviewMetricsPanel key={panel.category} config={panel} />
          )
        })}
    </Stack>
  )
}
