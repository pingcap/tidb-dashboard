import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Card, Stack, Title } from "@tidbcloud/uikit"

import { usePlansListData } from "../../../utils/use-data"

import { PlansListTable } from "./table"

export function PlansList() {
  const { data: plansListData, isLoading } = usePlansListData()

  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Title order={5}>Execution Plans</Title>

        {isLoading && <LoadingSkeleton />}

        {plansListData && plansListData.length > 0 && (
          <PlansListTable data={plansListData || []} />
        )}
      </Stack>
    </Card>
  )
}
