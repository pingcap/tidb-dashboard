import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { ActionIcon, Group, Stack, Typography } from "@tidbcloud/uikit"
import { IconChevronLeft } from "@tidbcloud/uikit/icons"

import { useAppContext } from "../../ctx"
import { usePlanDetailData } from "../../utils/use-data"

import { PlanDetail } from "./plan-detail"
import { PlansList } from "./plans-list"
import { SqlLimit } from "./sql-limit"
import { StmtBasic } from "./stmt-basic"
import { StmtSQL } from "./stmt-sql"

export function Detail() {
  const ctx = useAppContext()
  const { data: planData, isLoading } = usePlanDetailData("")

  return (
    <Stack>
      {ctx.cfg.showDetailBack !== false && (
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
      )}

      {isLoading && <LoadingSkeleton />}

      {planData && (
        <Stack>
          <StmtSQL title="Statement Template" sql={planData.digest_text!} />
          <StmtBasic stmt={planData} />
          <SqlLimit sqlDigest={planData.digest!} />
          <PlansList detailData={planData} />
          <PlanDetail />
        </Stack>
      )}
    </Stack>
  )
}
