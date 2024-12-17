import { formatSql } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Card, Stack, Title } from "@tidbcloud/uikit"
import { CodeBlock } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

export function StmtSQL({ title, sql }: { title: string; sql: string }) {
  const formattedSQL = useMemo(() => formatSql(sql), [sql])

  return (
    <Card shadow="xs" p="md">
      <Stack gap="xs">
        <Title order={5}>{title}</Title>

        <CodeBlock
          language="sql"
          foldProps={{
            persistenceKey: `statement.detail.${title}`,
            iconVisible: true,
          }}
        >
          {formattedSQL}
        </CodeBlock>
      </Stack>
    </Card>
  )
}
