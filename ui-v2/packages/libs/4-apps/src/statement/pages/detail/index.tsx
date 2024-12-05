import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Box, Button, Stack } from "@tidbcloud/uikit"
import { IconArrowLeft } from "@tidbcloud/uikit/icons"
import { useEffect, useMemo } from "react"

import { useAppContext } from "../../ctx"
import { useDetailUrlState } from "../../url-state/detail-url-state"
import { usePlansListData } from "../../utils/use-data"

import { PlansDetail } from "./plans-detail"
import { PlansList } from "./plans-list"
import { RelatedSlowQuery } from "./slow-query-list"
import { StmtBasic } from "./stmt-basic"
import { StmtSQL } from "./stmt-sql"

export function Detail() {
  const ctx = useAppContext()

  const { data: plansListData, isLoading } = usePlansListData()
  const planData = plansListData?.[0]

  const { id, plans, setPlans } = useDetailUrlState()
  useEffect(() => {
    // note: must check id, because id is empty when first render
    if (id && plans.length === 0 && plansListData) {
      setPlans(plansListData.map((plan) => plan.plan_digest!))
    }
  }, [id, plans, setPlans, plansListData])

  const selectedPlans = useMemo(() => {
    return plans.filter((p) => p !== "empty")
  }, [plans])

  return (
    <Stack>
      <Box>
        <Button onClick={ctx.actions.backToList}>
          <IconArrowLeft size={16} strokeWidth={2} /> Back
        </Button>
      </Box>

      {isLoading && <LoadingSkeleton />}

      {planData && (
        <Stack>
          <StmtSQL title="Statement Template" sql={planData.digest_text!} />
          <StmtBasic stmt={planData} plansCount={plansListData.length} />

          {plansListData.length > 1 && <PlansList data={plansListData} />}

          {selectedPlans.length > 0 && (
            <>
              <PlansDetail
                allPlansCount={plansListData.length}
                selectedPlansCount={selectedPlans.length}
              />
              <RelatedSlowQuery />
            </>
          )}
        </Stack>
      )}
    </Stack>
  )
}
