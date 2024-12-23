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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const ruGroup = formData.get("ruGroup") as string
    const action = formData.get("action") as string
    if (!ruGroup || !action) {
      return
    }
    try {
      await setLimitMut.mutateAsync({ ruGroup, action })
      notifier.success("Set SQL limit successfully")
    } catch (_err) {
      notifier.error("Set SQL limit failed")
    }
  }

  if (!ruGroups) {
    return null
  }

  if (ruGroups.length === 0) {
    return (
      <Typography>
        There is no resource groups, please create a resource group manually
        first
      </Typography>
    )
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <Group>
          <Select placeholder="Resource Group" data={ruGroups} name="ruGroup" />
          <Select
            placeholder="Action"
            data={["DRYRUN", "COOLDOWN", "KILL"]}
            name="action"
          />
          <Button ml="auto" type="submit">
            Set Limit
          </Button>
        </Group>
      </form>
    </Card>
  )
}

export function SqlLimitStatus() {
  const { data: sqlLimitStatus } = useSqlLimitStatusData()
  const deleteSqlLimitMut = useDeleteSqlLimitData()

  async function handleDelete() {
    try {
      await deleteSqlLimitMut.mutateAsync()
      notifier.success("Delete SQL limit successfully")
    } catch (_err) {
      notifier.error("Delete SQL limit failed")
    }
  }

  if (!sqlLimitStatus || !sqlLimitStatus.ru_group) {
    return null
  }

  return (
    <Card>
      <Group>
        <Typography>Resource Group: {sqlLimitStatus.ru_group}</Typography>
        <Typography>Action: {sqlLimitStatus.action}</Typography>
        <Button ml="auto" color="red" variant="outline" onClick={handleDelete}>
          Delete Limit
        </Button>
      </Group>
    </Card>
  )
}

export function SqlLimitBody() {
  const { data: sqlLimitSupport } = useSqlLimitSupportData()

  if (!sqlLimitSupport) {
    return <Skeleton height={10} />
  }

  if (!sqlLimitSupport.is_support) {
    return (
      <Typography c="gray">
        SQL limit feature is not supported in this version
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
  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Title order={5}>SQL Limit</Title>
        <SqlLimitBody />
      </Stack>
    </Card>
  )
}
