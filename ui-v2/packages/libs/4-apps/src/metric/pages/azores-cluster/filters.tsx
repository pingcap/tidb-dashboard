import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Group, SegmentedControl } from "@tidbcloud/uikit"

import { useMetricsUrlState } from "../../url-state"

const GROUPS = ["basic", "resource", "advanced"]

// @ts-expect-error @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useLocales() {
  const { tk } = useTn("metric")
  // for gogocode to scan and generate en.json before build
  tk("groups.basic", "Basic")
  tk("groups.resource", "Resource")
  tk("groups.advanced", "Advanced")
}

export function Filters() {
  const { tk } = useTn("metric")
  const { panel, setQueryParams } = useMetricsUrlState()
  const tabs = GROUPS?.map((p) => ({
    label: tk(`groups.${p}`),
    value: p,
  }))

  function handlePanelChange(newPanel: string) {
    setQueryParams({
      panel: newPanel || undefined,
      refresh: new Date().valueOf().toString(),
    })
  }

  const panelSwitch = tabs && tabs.length > 0 && (
    <SegmentedControl
      withItemsBorders={false}
      data={tabs}
      value={panel || tabs[0].value}
      onChange={handlePanelChange}
    />
  )

  return <Group>{panelSwitch}</Group>
}
