import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Stack, Title } from "@tidbcloud/uikit"

import { useDetailUrlState } from "../../../url-state/detail-url-state"
import { usePlanDetailData } from "../../../utils/use-data"
import { StmtSQL } from "../stmt-sql"

import { DetailTabs } from "./detail-tabs"
import { Plan } from "./plan"

export function PlanDetail() {
  const { plan } = useDetailUrlState()
  const { data: planDetailData, isLoading } = usePlanDetailData(plan)

  const title = plan ? `Execution Detail of ${plan}` : "Execution Detail"

  return (
    <Stack>
      <Title order={4}>{title}</Title>

      {isLoading && <LoadingSkeleton />}

      {planDetailData && (
        <>
          {planDetailData.prev_sample_text && (
            <StmtSQL
              title="Previous Query Sample"
              sql={planDetailData.prev_sample_text!}
            />
          )}
          {planDetailData.plan && <Plan plan={planDetailData.plan!} />}
          <DetailTabs data={planDetailData} />
        </>
      )}
    </Stack>
  )
}
