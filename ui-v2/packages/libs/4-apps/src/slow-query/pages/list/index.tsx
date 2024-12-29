import { Group, Stack, Title } from "@tidbcloud/uikit"

import { useAppContext } from "../../ctx"

// import { ColsSelect } from "./cols-select"
import { FiltersWithAdvanced } from "./filters-with-advanced"
import { RefreshButton } from "./refresh-button"
import { ListTable } from "./table"
import { TimeRangeClipAlert } from "./time-range-clip-alert"

export function List() {
  const ctx = useAppContext()

  return (
    <Stack>
      {ctx.cfg.title && (
        <Title order={1} mb="md">
          {ctx.cfg.title}
        </Title>
      )}

      <Group>
        <FiltersWithAdvanced />
        <Group ml="auto">
          {/* <ColsSelect /> */}
          <RefreshButton />
        </Group>
      </Group>

      <TimeRangeClipAlert />

      <ListTable />
    </Stack>
  )
}
