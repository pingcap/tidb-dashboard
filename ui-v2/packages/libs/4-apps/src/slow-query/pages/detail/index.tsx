import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Box, Button, Stack } from "@tidbcloud/uikit"
import { IconArrowLeft } from "@tidbcloud/uikit/icons"

import { useAppContext } from "../../ctx"
import { useDetailData } from "../../utils/use-data"

import { DetailTabs } from "./detail-tabs"
import { DetailPlan } from "./plan"
import { DetailQuery } from "./query"

export function Detail() {
  const ctx = useAppContext()

  const { data: detailData, isLoading } = useDetailData()

  return (
    <Stack>
      <Box>
        <Button onClick={ctx.actions.backToList}>
          <IconArrowLeft size={16} strokeWidth={2} /> Back
        </Button>
      </Box>

      {isLoading && <LoadingSkeleton />}

      {detailData && (
        <Stack>
          <DetailQuery sql={detailData.query || ""} />
          <DetailPlan plan={detailData.plan || ""} />
          <DetailTabs data={detailData} />
        </Stack>
      )}
    </Stack>
  )
}