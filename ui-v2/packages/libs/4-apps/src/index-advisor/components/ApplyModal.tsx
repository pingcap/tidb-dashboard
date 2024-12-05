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
import { useAdvisorData, useApplyAdvisor } from "../utils/use-data"

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

export function ApplyModal() {
  const { applyId, setApplyId } = useIndexAdvisorUrlState()
  const { data: advisor, isLoading } = useAdvisorData(applyId)
  const applyAdvisorMut = useApplyAdvisor()

  async function handleSubmit() {
    try {
      await applyAdvisorMut.mutateAsync(applyId)
      notifier.success(`Apply advisor ${advisor?.name} successfully!`)
      setApplyId()
    } catch (error: unknown) {
      notifier.error(
        `Apply advisor ${advisor?.name} failed, reason: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  return (
    <Modal
      centered
      withinPortal
      title="Apply index advisor"
      opened={!!applyId}
      onClose={() => setApplyId()}
      zIndex={201}
      size={640}
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <Form
          actionsProps={{
            confirmText: "Apply",
            loading: applyAdvisorMut.isPending,
          }}
          onCancel={() => setApplyId()}
          onSubmit={handleSubmit}
        >
          <Box>
            <Typography variant="body-lg">
              You are about to apply index advisor
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
