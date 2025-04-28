import { formatSql, useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Card, Stack, Title } from "@tidbcloud/uikit"
import { CodeBlock } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

export function DetailQuery({ sql }: { sql: string }) {
  const formattedSQL = useMemo(() => formatSql(sql), [sql])

  const { tt } = useTn("slow-query")

  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Title order={5}>{tt("Query")}</Title>

        <CodeBlock
          language="sql"
          foldProps={{
            persistenceKey: "slowquery.detail.query",
            iconVisible: true,
          }}
        >
          {formattedSQL}
        </CodeBlock>
      </Stack>
    </Card>
  )
}
