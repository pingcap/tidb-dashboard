import { useMetricQueriesConfigData } from "../../utils/use-data"

import { TemOverviewPanel } from "./panel"

export function TemOverviewPage() {
  const { data: panelConfigData } = useMetricQueriesConfigData("tem-overview")

  return panelConfigData?.map((panel) => {
    return <TemOverviewPanel key={panel.category} config={panel} />
  })
}
