import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Stack, Title } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { useDetailUrlState } from "../../../shared-state/detail-url-state"
import { usePlanDetailData } from "../../../utils/use-data"
import { StmtSQL } from "../stmt-sql"

import { DetailTabs } from "./detail-tabs"
import { Plan } from "./plan"

export function PlanDetail() {
  const { tt } = useTn("statement")
  const { plan } = useDetailUrlState()
  const realPlan = plan && plan !== "all" ? plan : ""
  const { data: planDetailData, isLoading } = usePlanDetailData(realPlan)

  const title = useMemo(() => {
    if (plan === "all") {
      return tt("Execution Detail of All Plans")
    } else if (plan) {
      return tt("Execution Detail of {{plan}}", { plan })
    }
    return tt("Execution Detail")
  }, [plan, tt])

  return (
    <Stack>
      <Title order={4}>{title}</Title>

      {isLoading && <LoadingSkeleton />}

      {planDetailData && (
        <>
          {planDetailData.query_sample_text && (
            <StmtSQL
              title={tt("Query Sample")}
              sql={planDetailData.query_sample_text!}
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
