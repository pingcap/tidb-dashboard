import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { ActionIcon, Group, Stack, Typography } from "@tidbcloud/uikit"
import { IconChevronLeft } from "@tidbcloud/uikit/icons"

import { useAppContext } from "../../ctx"
import { useDetailData } from "../../utils/use-data"

import { DetailTabs } from "./detail-tabs"
import { DetailPlan } from "./plan"
import { DetailQuery } from "./query"
import { SqlLimit } from "./sql-limit"

export function Detail() {
  const ctx = useAppContext()

  const { data: detailData, isLoading } = useDetailData()

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
          <Typography variant="title-lg">Slow Query Detail</Typography>
        </Group>
      )}

      {isLoading && <LoadingSkeleton />}

      {detailData && (
        <Stack>
          <DetailQuery sql={detailData.query || ""} />

          <SqlLimit sqlDigest={detailData.digest!} />

          {detailData.plan && <DetailPlan plan={detailData.plan} />}

          <DetailTabs data={detailData} />
        </Stack>
      )}
    </Stack>
  )
}
