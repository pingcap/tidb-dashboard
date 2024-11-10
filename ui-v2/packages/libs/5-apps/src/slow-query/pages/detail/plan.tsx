import { CodeBlock } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  Card,
  Stack,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

export function DetailPlan({ plan }: { plan: string }) {
  return (
    <Card shadow="xs" p="xl">
      <Stack spacing="xs">
        <Title order={5}>Plan</Title>

        <CodeBlock
          codeRender={(content) => <pre>{content}</pre>}
          foldProps={{
            persistenceKey: "slowquery.detail.plan",
            iconVisible: true,
          }}
        >
          {plan}
        </CodeBlock>
      </Stack>
    </Card>
  )
}
