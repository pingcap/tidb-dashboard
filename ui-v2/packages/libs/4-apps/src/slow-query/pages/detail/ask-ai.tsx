import {
  ActionDrawer,
  LoadingSkeleton,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useMutation } from "@tanstack/react-query"
import { Box, Button, Group, Stack, Typography } from "@tidbcloud/uikit"
import { useDisclosure } from "@tidbcloud/uikit/hooks"
import { IconAiMessage } from "@tidbcloud/uikit/icons"
import hljs from "highlight.js"
import { Marked } from "marked"
import { markedHighlight } from "marked-highlight"
import { useEffect } from "react"
// import ReactMarkdown from "react-markdown"

import { useAppContext } from "../../ctx"
import { useDetailUrlState } from "../../shared-state/detail-url-state"

import "highlight.js/styles/github.css"

const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang, _info) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext"
      return hljs.highlight(code, { language }).value
    },
  }),
)

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
      title="Ask AI to Optimize Slow Query"
      size={720}
    >
      <ActionDrawer.Body>
        <Stack>
          <Stack gap={2}>
            <Typography variant="body-lg">
              The optimizer will base on the slow query text, execution plan,
              table schema and index, to detect the bottleneck, and give
              optimize and rewrite advices.
            </Typography>
            <Typography c="carbon.7">
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
          {mut.data && (
            // <Card sx={{ overflow: 'auto' }} mah="calc(100vh - 248px)">
            //   <ReactMarkdown>{mut.data}</ReactMarkdown>
            // </Card>
            <Box
              sx={(th) => ({
                overflow: "auto",
                borderRadius: 8,
                border: `1px solid ${th.colors.carbon[5]}`,
              })}
              mah="calc(100vh - 248px)"
              p={16}
              bg={"carbon.3"}
              dangerouslySetInnerHTML={{ __html: marked.parse(mut.data) }}
            />
          )}
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
