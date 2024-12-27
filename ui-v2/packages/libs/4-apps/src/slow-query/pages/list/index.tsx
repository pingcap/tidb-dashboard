import { Group, Stack, Title } from "@tidbcloud/uikit"

import { useAppContext } from "../../ctx"

import { FiltersWithAdvanced } from "./filters-with-advanced"
import { RefreshButton } from "./refresh-button"
import { ListTable } from "./table"

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
          <RefreshButton />
        </Group>
      </Group>

      <ListTable />
    </Stack>
  )
}
