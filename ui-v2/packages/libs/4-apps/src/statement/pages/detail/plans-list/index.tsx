import { Alert, Card, Stack, Title, Typography } from "@tidbcloud/uikit"

import { StatementModel } from "../../../models"

import { PlansListTable } from "./table"

export function PlansList({ data }: { data: StatementModel[] }) {
  return (
    <Card shadow="xs" p="xl">
      <Stack gap="xs">
        <Title order={5}>Execution Plans</Title>

        <Alert>
          <Typography>
            There are multiple execution plans for this kind of SQL statement.
            You can choose to view one or multiple of them.
          </Typography>
        </Alert>

        <PlansListTable data={data} />
      </Stack>
    </Card>
  )
}
