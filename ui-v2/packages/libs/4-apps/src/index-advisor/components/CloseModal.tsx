import {
  Box,
  Modal,
  Skeleton,
  Stack,
  Typography,
  notifier,
} from "@tidbcloud/uikit"
import { CodeBlock, Form } from "@tidbcloud/uikit/biz"

import { useIndexAdvisorUrlState } from "../url-state/list-url-state"
import { useAdvisorData, useCloseAdvisor } from "../utils/use-data"

function LoadingSkeleton() {
  return (
    <Stack gap="xl">
      <Skeleton height={10} />
      <Skeleton height={10} />
      <Skeleton height={10} />
      <Skeleton height={10} />
    </Stack>
  )
}

export function CloseModal() {
  const { closeId, setCloseId } = useIndexAdvisorUrlState()
  const { data: advisor, isLoading } = useAdvisorData(closeId)
  const closeAdvisorMut = useCloseAdvisor()

  async function handleSubmit() {
    try {
      await closeAdvisorMut.mutateAsync(closeId)
      notifier.success(`Close advisor ${advisor?.name} successfully!`)
      setCloseId()
    } catch (error: unknown) {
      notifier.error(
        `Close advisor ${advisor?.name} failed, reason: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  return (
    <Modal
      centered
      withinPortal
      title="Close index advisor"
      opened={!!closeId}
      onClose={() => setCloseId()}
      zIndex={201}
      size={640}
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <Form
          actionsProps={{
            confirmText: "Close advisor",
            loading: closeAdvisorMut.isPending,
          }}
          onCancel={() => setCloseId()}
          onSubmit={handleSubmit}
        >
          <Box>
            <Typography variant="body-lg">
              You are about to close index advisor
            </Typography>
            <Typography variant="label-lg">{advisor?.name}.</Typography>
            <CodeBlock mt={8} language="sql">
              {advisor?.index_statement ?? ""}
            </CodeBlock>
          </Box>
        </Form>
      )}
    </Modal>
  )
}
