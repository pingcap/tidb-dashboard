import { IconArrowLeft } from "@pingcap-incubator/tidb-dashboard-lib-icons"
import {
  Box,
  Button,
  Loader,
  Stack,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { useAppContext } from "../cxt/context"
import { useDetailData } from "../utils/use-data"

import { DetailTabs } from "./detail/detail-tabs"

export function Detail() {
  const ctx = useAppContext()

  const { data: detailData, isLoading } = useDetailData()

  return (
    <Stack>
      {ctx.cfg.title && (
        <Title order={1} mb="md">
          {ctx.cfg.title}
        </Title>
      )}

      <Box>
        {isLoading && <Loader />}
        {detailData && <DetailTabs data={detailData} />}
      </Box>

      <Box>
        <Button onClick={ctx.actions.backToList}>
          <IconArrowLeft size={16} strokeWidth={2} /> Back
        </Button>
      </Box>
    </Stack>
  )
}
