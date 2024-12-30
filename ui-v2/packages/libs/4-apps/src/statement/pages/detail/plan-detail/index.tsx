import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Stack, Title } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { useDetailUrlState } from "../../../url-state/detail-url-state"
import { usePlanDetailData } from "../../../utils/use-data"
import { StmtSQL } from "../stmt-sql"

import { DetailTabs } from "./detail-tabs"
import { Plan } from "./plan"

export function PlanDetail() {
  const { plan } = useDetailUrlState()
  const realPlan = plan && plan !== "all" ? plan : ""
  const { data: planDetailData, isLoading } = usePlanDetailData(realPlan)

  const title = useMemo(() => {
    if (plan === "all") {
      return "Execution Detail of All Plans"
    } else if (plan) {
      return `Execution Detail of ${plan}`
    }
    return "Execution Detail"
  }, [plan])

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
          {planDetailData.plan && plan !== "all" && (
            <Plan plan={planDetailData.plan!} />
          )}
          <DetailTabs data={planDetailData} />
        </>
      )}
    </Stack>
  )
}
