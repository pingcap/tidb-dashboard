import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Card, Group, Stack, Title, Typography } from "@tidbcloud/uikit"

import { useSqlLimitSupportData } from "../utils/use-data"

import { SqlLimitSettingModal } from "./setting"
import { SqlLimitTable } from "./table"

export function SqlLimitCard() {
  const { tt } = useTn("sql-limit")
  const { data: sqlLimitSupport } = useSqlLimitSupportData()

  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Group justify="space-between">
          <Title order={5}>{tt("SQL Limit")}</Title>
          {sqlLimitSupport?.is_support && <SqlLimitSettingModal />}
        </Group>
        {sqlLimitSupport && !sqlLimitSupport.is_support && (
          <Typography c="gray">
            {tt(
              "SQL limit feature is only available in and above {{distro.tidb}} 7.5.0",
            )}
          </Typography>
        )}
        {sqlLimitSupport && sqlLimitSupport.is_support && <SqlLimitTable />}
      </Stack>
    </Card>
  )
}
