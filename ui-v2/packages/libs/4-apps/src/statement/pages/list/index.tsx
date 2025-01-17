import { Box, Group, Stack, Title } from "@tidbcloud/uikit"

import { useAppContext } from "../../ctx"
import { useListData } from "../../utils/use-data"

import { ColsSelect } from "./cols-select"
import { FiltersWithAdvanced } from "./filters-with-advanced"
import { RefreshButton } from "./refresh-button"
import { StatementSettingButton } from "./stmt-setting-button"
import { ListTable } from "./table"
import { TimeRangeFixAlert } from "./time-range-fix-alert"

export function List() {
  const ctx = useAppContext()
  const { data, isLoading } = useListData()

  return (
    <Stack>
      {ctx.cfg.title && (
        <Title order={1} mb="md">
          {ctx.cfg.title}
        </Title>
      )}

      <Group>
        <FiltersWithAdvanced />

        <Box sx={{ flexGrow: 1 }} />

        <ColsSelect />
        <RefreshButton />
        <StatementSettingButton />
      </Group>

      <TimeRangeFixAlert data={data || []} />

      <ListTable data={data || []} isLoading={isLoading} />
    </Stack>
  )
}
