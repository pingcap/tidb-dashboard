import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { ActionIcon, Group, Stack, Typography } from "@tidbcloud/uikit"
import { IconChevronLeft } from "@tidbcloud/uikit/icons"
import { useEffect, useMemo } from "react"

import { useAppContext } from "../../ctx"
import { useDetailUrlState } from "../../url-state/detail-url-state"
import { usePlansListData } from "../../utils/use-data"

import { PlansDetail } from "./plans-detail"
import { PlansList } from "./plans-list"
import { RelatedSlowQuery } from "./related-slow-query"
import { SqlLimit } from "./sql-limit"
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
      <Group wrap="nowrap">
        <ActionIcon
          aria-label="Navigate Back"
          variant="default"
          onClick={ctx.actions.backToList}
        >
          <IconChevronLeft size={20} />
        </ActionIcon>
        <Typography variant="title-lg">Statement Detail</Typography>
      </Group>

      {isLoading && <LoadingSkeleton />}

      {planData && (
        <Stack>
          <StmtSQL title="Statement Template" sql={planData.digest_text!} />
          <StmtBasic stmt={planData} plansCount={plansListData.length} />

          <SqlLimit sqlDigest={planData.digest!} />

          {plansListData.length > 0 && <PlansList data={plansListData} />}

          <RelatedSlowQuery />

          {selectedPlans.length > 0 && (
            <PlansDetail
              allPlansCount={plansListData.length}
              selectedPlansCount={selectedPlans.length}
            />
          )}
        </Stack>
      )}
    </Stack>
  )
}
