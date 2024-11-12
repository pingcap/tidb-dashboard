import { CodeBlock } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  Card,
  Stack,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { formatSql } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

export function StmtTemplate({ sql }: { sql: string }) {
  const formattedSQL = useMemo(() => formatSql(sql), [sql])

  return (
    <Card shadow="xs" p="xl">
      <Stack spacing="xs">
        <Title order={5}>Statement Template</Title>

        <CodeBlock
          language="sql"
          foldProps={{
            persistenceKey: "statement.detail.stmt-template",
            iconVisible: true,
          }}
        >
          {formattedSQL}
        </CodeBlock>
      </Stack>
    </Card>
  )
}
