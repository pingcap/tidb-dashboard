import { CodeBlock } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  Card,
  Stack,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { formatSql } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

export function StmtSQL({ title, sql }: { title: string; sql: string }) {
  const formattedSQL = useMemo(() => formatSql(sql), [sql])

  return (
    <Card shadow="xs" p="xl">
      <Stack spacing="xs">
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
