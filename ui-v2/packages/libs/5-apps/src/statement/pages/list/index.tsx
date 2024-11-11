import {
  Group,
  Stack,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { useAppContext } from "../../ctx/context"

import { Filters } from "./filters"
import { RefreshButton } from "./refresh-button"

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
        <Group ml="auto">
          <RefreshButton />
        </Group>
      </Group>
    </Stack>
  )
}
