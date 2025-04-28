import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ActionIcon, Group, Stack, Typography } from "@tidbcloud/uikit"
import { IconChevronLeft } from "@tidbcloud/uikit/icons"

import { useAppContext } from "../../ctx"
import { usePlanDetailData } from "../../utils/use-data"

import { PlanDetail } from "./plan-detail"
import { PlansList } from "./plans-list"
import { SqlHistory } from "./sql-history"
import { SqlLimit } from "./sql-limit"
import { StmtBasic } from "./stmt-basic"
import { StmtSQL } from "./stmt-sql"

export function Detail() {
  const { tt } = useTn("statement")
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
          <Typography variant="title-lg">{tt("Statement Detail")}</Typography>
        </Group>
      )}

      {isLoading && <LoadingSkeleton />}

      {planData && (
        <Stack>
          <StmtSQL
            title={tt("Statement Template")}
            sql={planData.digest_text!}
          />
          <StmtBasic stmt={planData} />

          <SqlHistory sqlDigest={planData.digest!} />
          <SqlLimit sqlDigest={planData.digest!} />

          <PlansList detailData={planData} />
          <PlanDetail />
        </Stack>
      )}
    </Stack>
  )
}
