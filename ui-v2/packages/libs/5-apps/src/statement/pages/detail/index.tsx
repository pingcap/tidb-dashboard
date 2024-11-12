import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { IconArrowLeft } from "@pingcap-incubator/tidb-dashboard-lib-icons"
import {
  Box,
  Button,
  Stack,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useEffect } from "react"

import { useAppContext } from "../../ctx/context"
import { useDetailUrlState } from "../../url-state/detail-url-state"
import { usePlansListData } from "../../utils/use-data"

import { PlansList } from "./plans-list"
import { StmtBasic } from "./stmt-basic"
import { StmtTemplate } from "./stmt-template"

export function Detail() {
  const ctx = useAppContext()

  const { data: plansListData, isLoading } = usePlansListData()
  const planData = plansListData?.[0]

  const { plans, setPlans } = useDetailUrlState()
  useEffect(() => {
    if (plans.length === 0 && plansListData) {
      setPlans(plansListData.map((plan) => plan.plan_digest!))
    }
  }, [plansListData, plans, setPlans])

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
          <StmtTemplate sql={planData.digest_text!} />
          <StmtBasic stmt={planData} plansCount={plansListData.length} />

          <PlansList data={plansListData} />
        </Stack>
      )}
    </Stack>
  )
}
