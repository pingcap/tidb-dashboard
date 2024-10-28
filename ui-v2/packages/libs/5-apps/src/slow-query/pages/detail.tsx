import { IconArrowLeft } from "@pingcap-incubator/tidb-dashboard-lib-icons"
import {
  Box,
  Button,
  Container,
  Loader,
  Stack,
  Text,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { useAppContext } from "../cxt/context"
import { useDetailData } from "../utils/use-data"

export function Detail() {
  const cxt = useAppContext()

  const { data: detailData, isLoading } = useDetailData()

  return (
    <Container>
      <Title order={1} mb="md">
        {cxt.cfg.title ?? "Slow Query App"}
      </Title>
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
      <Button onClick={cxt.actions.backToList}>
        <IconArrowLeft size={16} strokeWidth={2} /> Back
      </Button>
    </Container>
  )
}
