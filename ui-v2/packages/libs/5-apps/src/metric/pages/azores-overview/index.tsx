import { useMetricQueriesConfigData } from "../../utils/use-data"

import { AzoresOverviewPanel } from "./panel"

export function AzoresOverviewPage() {
  const { data: panelConfigData } =
    useMetricQueriesConfigData("azores-overview")

  return panelConfigData?.map((panel) => {
    return <AzoresOverviewPanel key={panel.category} config={panel} />
  })
}
