import { Stack } from "@tidbcloud/uikit"

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
