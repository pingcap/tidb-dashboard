import { IconArrowLeft } from "@pingcap-incubator/tidb-dashboard-lib-icons"
import {
  Box,
  Button,
  Loader,
  Stack,
  Text,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { useAppContext } from "../cxt/context"
import { useDetailData } from "../utils/use-data"

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
        {isLoading ? (
          <Loader />
        ) : detailData ? (
          <Stack>
            <Text>
              <strong>ID:</strong> {detailData.id}
            </Text>
            <Text>
              <strong>Query:</strong> {detailData.query}
            </Text>
            <Text>
              <strong>Latency:</strong> {detailData.latency}
            </Text>
          </Stack>
        ) : null}
      </Box>
      <Box>
        <Button onClick={ctx.actions.backToList}>
          <IconArrowLeft size={16} strokeWidth={2} /> Back
        </Button>
      </Box>
    </Stack>
  )
}
