import { Card, Stack, Title } from "@tidbcloud/uikit"

import { ListTable } from "./table"

export function RelatedSlowQuery() {
  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Title order={5}>Related Slow Query</Title>

        <ListTable />
      </Stack>
    </Card>
  )
}
