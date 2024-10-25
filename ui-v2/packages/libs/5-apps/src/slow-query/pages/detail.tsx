import {
  Box,
  Container,
  Loader,
  Stack,
  Title,
  Text,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../cxt/context"

import { useDetailUrlState } from "./detail-url-state"

export function Detail() {
  const cxt = useAppContext()
  const { id } = useDetailUrlState()

  const { data: detailData, isLoading } = useQuery({
    queryKey: ["slow_query", "detail", cxt.extra.clusterId, id],
    queryFn: () => {
      return cxt.api.getSlowQuery({ id })
    },
  })

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
    </Container>
  )
}
