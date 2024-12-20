import {
  Button,
  Card,
  Group,
  Select,
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

export function SqlLimitSetting({ sqlDigest }: { sqlDigest: string }) {
  const { data: ruGroups } = useRuGroupsData()
  const setLimitMut = useCreateSqlLimitData(sqlDigest)

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
      notifier.success("Set SQL Limit successfully")
    } catch (_err) {
      notifier.error("Set SQL Limit failed")
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

export function SqlLimitStatus({ sqlDigest }: { sqlDigest: string }) {
  const { data: sqlLimitStatus } = useSqlLimitStatusData(sqlDigest)
  const deleteSqlLimitMut = useDeleteSqlLimitData(sqlDigest)

  async function handleDelete() {
    try {
      await deleteSqlLimitMut.mutateAsync()
      notifier.success("Delete SQL Limit successfully")
    } catch (_err) {
      notifier.error("Delete SQL Limit failed")
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
        <Button ml="auto" c="red" variant="outline" onClick={handleDelete}>
          Delete Limit
        </Button>
      </Group>
    </Card>
  )
}

export function SqlLimitBody({ sqlDigest }: { sqlDigest: string }) {
  const { data: sqlLimitSupport } = useSqlLimitSupportData()

  if (!sqlLimitSupport) {
    return <div>loading...</div>
  }

  if (!sqlLimitSupport.is_support) {
    return (
      <Typography c="gray">
        SQL Limit is not supported in this version, please upgrade to the latest
        version
      </Typography>
    )
  }

  return (
    <Stack>
      <SqlLimitStatus sqlDigest={sqlDigest} />
      <SqlLimitSetting sqlDigest={sqlDigest} />
    </Stack>
  )
}

export function SqlLimitCard({ sqlDigest }: { sqlDigest: string }) {
  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Title order={5}>SQL Limit</Title>
        <SqlLimitBody sqlDigest={sqlDigest} />
      </Stack>
    </Card>
  )
}
