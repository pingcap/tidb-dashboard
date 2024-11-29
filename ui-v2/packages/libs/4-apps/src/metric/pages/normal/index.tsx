import { Stack } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { Filters } from "./filters"
import { Panel } from "./panel"

export function NormalMetricsPage() {
  return (
    <Stack>
      <Filters />
      <Panel />
    </Stack>
  )
}
