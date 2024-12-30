import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Card, Stack, Title } from "@tidbcloud/uikit"

import { StatementModel } from "../../../models"
import { usePlansListData } from "../../../utils/use-data"

import { PlansListTable } from "./table"

export function PlansList({ detailData }: { detailData: StatementModel }) {
  const { data: plansListData, isLoading } = usePlansListData()

  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Title order={5}>Execution Plans</Title>

        {isLoading && <LoadingSkeleton />}

        <PlansListTable data={plansListData || []} detailData={detailData} />
      </Stack>
    </Card>
  )
}
