import {
  Card,
  Skeleton,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { useMetricQueriesConfigData } from "../../utils/use-data"

import { AzoresOverviewPanel } from "./panel"

export function AzoresOverviewPage() {
  const { data: panelConfigData, isLoading } =
    useMetricQueriesConfigData("azores-overview")

  if (isLoading) {
    return (
      <Card p={24} bg="carbon.0">
        <Skeleton visible={true} h={290} />
      </Card>
    )
  }

  return panelConfigData
    ?.filter((p) => p.charts.length > 0)
    .map((panel) => {
      return <AzoresOverviewPanel key={panel.category} config={panel} />
    })
}
