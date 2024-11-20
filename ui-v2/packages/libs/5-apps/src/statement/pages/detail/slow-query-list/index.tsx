import {
  Card,
  Stack,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { ListTable } from "./table"

export function RelatedSlowQuery() {
  return (
    <Card shadow="xs" p="xl">
      <Stack spacing="xs">
        <Title order={5}>Related Slow Query</Title>

        <ListTable />
      </Stack>
    </Card>
  )
}
