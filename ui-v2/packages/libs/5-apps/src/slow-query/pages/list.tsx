import {
  Group,
  Stack,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { Filters } from "../components/filters"
import { ListTable } from "../components/list-table"
import { RefreshButton } from "../components/refresh-button"
import { useAppContext } from "../ctx/context"

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
        <Filters />
        <RefreshButton />
      </Group>

      <ListTable />
    </Stack>
  )
}
