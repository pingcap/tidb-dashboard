import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ActionIcon, Group, Stack, Typography } from "@tidbcloud/uikit"
import { IconChevronLeft } from "@tidbcloud/uikit/icons"

import { useAppContext } from "../../ctx"
import { useDetailData } from "../../utils/use-data"

import { DetailTabs } from "./detail-tabs"
import { DetailPlan } from "./plan"
import { DetailQuery } from "./query"
import { RelatedStatementButton } from "./related-statement-button"
import { SqlHistory } from "./sql-history"
import { SqlLimit } from "./sql-limit"

export function Detail() {
  const ctx = useAppContext()

  const { data: detailData, isLoading } = useDetailData()
  const { tt } = useTn("slow-query")

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
          <Typography variant="title-lg">{tt("Slow Query Detail")}</Typography>
          <Group ml="auto">
            <RelatedStatementButton />
          </Group>
        </Group>
      )}

      {isLoading && <LoadingSkeleton />}

      {detailData && (
        <Stack>
          <DetailQuery sql={detailData.query || ""} />

          {/* <RelatedStatementLink dbName={detailData.db!} /> */}

          <SqlHistory sqlDigest={detailData.digest!} />
          <SqlLimit sqlDigest={detailData.digest!} />

          {detailData.plan && <DetailPlan plan={detailData.plan} />}

          <DetailTabs data={detailData} />
        </Stack>
      )}
    </Stack>
  )
}

export { RelatedStatementButton }
