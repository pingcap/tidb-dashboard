import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  Stack,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useMemo } from "react"

import { usePlansDetailData } from "../../../utils/use-data"
import { StmtSQL } from "../stmt-sql"

import { DetailTabs } from "./detail-tabs"
import { Plan } from "./plan"

type PlanDetailProps = {
  allPlansCount: number
  selectedPlansCount: number
}

export function PlansDetail({
  allPlansCount,
  selectedPlansCount,
}: PlanDetailProps) {
  const { data: plansDetailData, isLoading } = usePlansDetailData()

  const title = useMemo(() => {
    if (selectedPlansCount === allPlansCount && selectedPlansCount > 1) {
      return "Execution Detail of All Plans"
    }
    if (selectedPlansCount < allPlansCount && selectedPlansCount > 0) {
      return `Execution Detail of Selected ${selectedPlansCount} Plans`
    }
    return "Execution Detail"
  }, [allPlansCount, selectedPlansCount])

  return (
    <Stack>
      <Title order={4}>{title}</Title>

      {isLoading && <LoadingSkeleton />}

      {plansDetailData && (
        <>
          {plansDetailData.prev_sample_text && (
            <StmtSQL
              title="Previous Query Sample"
              sql={plansDetailData.prev_sample_text!}
            />
          )}
          <Plan plan={plansDetailData.plan!} />

          <DetailTabs data={plansDetailData} />
        </>
      )}
    </Stack>
  )
}
