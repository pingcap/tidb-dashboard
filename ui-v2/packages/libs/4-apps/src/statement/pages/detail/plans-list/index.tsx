import { Card, Stack, Title } from "@tidbcloud/uikit"

import { StatementModel } from "../../../models"

import { PlansListTable } from "./table"

export function PlansList({ data }: { data: StatementModel[] }) {
  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Title order={5}>Execution Plans</Title>
        <PlansListTable data={data} />
      </Stack>
    </Card>
  )
}
