import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Button,
  Card,
  Group,
  Select,
  Skeleton,
  Stack,
  Title,
  Typography,
  notifier,
} from "@tidbcloud/uikit"
import { useState } from "react"

import {
  useCreateSqlLimitData,
  useDeleteSqlLimitData,
  useRuGroupsData,
  useSqlLimitStatusData,
  useSqlLimitSupportData,
} from "../utils/use-data"

export function SqlLimitSetting() {
  const { data: ruGroups } = useRuGroupsData()
  const setLimitMut = useCreateSqlLimitData()

  const [resourceGroup, setResourceGroup] = useState("")
  const [action, setAction] = useState("")

  const { tt } = useTn("sql-limit")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!resourceGroup || !action) {
      return
    }
    try {
      await setLimitMut.mutateAsync({ ruGroup: resourceGroup, action })
      notifier.success(tt("Set SQL limit successfully"))
    } catch (_err) {
      notifier.error(tt("Set SQL limit failed"))
    }
  }

  if (!ruGroups) {
    return null
  }

  if (ruGroups.length === 0) {
    return (
      <Typography>
        {tt(
          "There is no resource groups, please create a resource group manually first",
        )}
      </Typography>
    )
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <Group>
          <Select
            placeholder={tt("Resource Group")}
            data={ruGroups}
            value={resourceGroup}
            onChange={(v) => setResourceGroup(v || "")}
          />
          <Select
            placeholder={tt("Action")}
            data={["DRYRUN", "COOLDOWN", "KILL"]}
            value={action}
            onChange={(v) => setAction(v || "")}
          />
          <Button ml="auto" type="submit" disabled={!resourceGroup || !action}>
            {tt("Set Limit")}
          </Button>
        </Group>
      </form>
    </Card>
  )
}

export function SqlLimitStatus() {
  const { data: sqlLimitStatus } = useSqlLimitStatusData()
  const deleteSqlLimitMut = useDeleteSqlLimitData()
  const { tt } = useTn("sql-limit")

  async function handleDelete() {
    try {
      await deleteSqlLimitMut.mutateAsync()
      notifier.success(tt("Delete SQL limit successfully"))
    } catch (_err) {
      notifier.error(tt("Delete SQL limit failed"))
    }
  }

  if (!sqlLimitStatus || !sqlLimitStatus.ru_group) {
    return null
  }

  return (
    <Card>
      <Group>
        <Typography>
          {tt("Resource Group")}: {sqlLimitStatus.ru_group}
        </Typography>
        <Typography>
          {tt("Action")}: {sqlLimitStatus.action}
        </Typography>
        <Button ml="auto" color="red" variant="outline" onClick={handleDelete}>
          {tt("Delete Limit")}
        </Button>
      </Group>
    </Card>
  )
}

export function SqlLimitBody() {
  const { data: sqlLimitSupport } = useSqlLimitSupportData()
  const { tt } = useTn("sql-limit")

  if (!sqlLimitSupport) {
    return <Skeleton height={10} />
  }

  if (!sqlLimitSupport.is_support) {
    return (
      <Typography c="gray">
        {tt(
          "SQL limit feature is only available in and above {{distro.tidb}} 7.5.0",
        )}
      </Typography>
    )
  }

  return (
    <Stack>
      <SqlLimitStatus />
      <SqlLimitSetting />
    </Stack>
  )
}

export function SqlLimitCard() {
  const { tt } = useTn("sql-limit")
  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Title order={5}>{tt("SQL Limit")}</Title>
        <SqlLimitBody />
      </Stack>
    </Card>
  )
}
