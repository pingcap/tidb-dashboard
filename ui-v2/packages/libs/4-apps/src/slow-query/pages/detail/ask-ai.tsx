import {
  ActionDrawer,
  LoadingSkeleton,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useMutation } from "@tanstack/react-query"
import { Button, Group, Stack, Typography } from "@tidbcloud/uikit"
import { useDisclosure } from "@tidbcloud/uikit/hooks"
import { IconAiMessage } from "@tidbcloud/uikit/icons"
import { useEffect } from "react"
import ReactMarkdown from "react-markdown"

import { useAppContext } from "../../ctx"
import { useDetailUrlState } from "../../shared-state/detail-url-state"

function AiDrawer({
  onClose,
  opened,
}: {
  opened: boolean
  onClose: () => void
}) {
  const ctx = useAppContext()
  const { id } = useDetailUrlState()

  const mut = useMutation({
    mutationFn: (id: string) => {
      return ctx.api.optimizeByAi({ id })
    },
    onSuccess: () => {
      // todo
    },
  })

  async function handleStart() {
    await mut.mutateAsync(id)
  }

  useEffect(() => {
    if (opened && !mut.data && !mut.isPending) {
      handleStart()
    }
  }, [opened])

  return (
    <ActionDrawer
      opened={opened}
      onClose={onClose}
      title="Slow Query Optimizer By AI"
      size={720}
    >
      <ActionDrawer.Body>
        <Stack>
          <Stack gap={2}>
            <Typography variant="body-lg">
              The optimizer will base on the slow query text, execution plan,
              table schema and index, to detect the bottleneck, and give optimze
              and rewrite advice.
            </Typography>
            <Typography c="gray">
              *note: the answer may not be correct, you need to check it by
              yourself.
            </Typography>
          </Stack>
          <Group grow>
            {/* <Button variant="default">Use Customized Prompt</Button> */}
            {/* <Button loading={mut.isPending} onClick={handleStart}>
              Start
            </Button> */}
            {(mut.data || mut.error) && (
              <Button onClick={handleStart}>Ask Again</Button>
            )}
          </Group>

          {mut.isPending && <LoadingSkeleton />}
          {mut.data && <ReactMarkdown>{mut.data}</ReactMarkdown>}
        </Stack>
      </ActionDrawer.Body>
    </ActionDrawer>
  )
}

export function AskAiButton() {
  const [drawerOpen, drawHandler] = useDisclosure(false)

  return (
    <>
      <Button
        variant="default"
        leftSection={<IconAiMessage />}
        onClick={drawHandler.open}
      >
        Ask AI to Optimize
      </Button>
      <AiDrawer opened={drawerOpen} onClose={drawHandler.close} />
    </>
  )
}
