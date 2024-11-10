import { CodeBlock } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  Card,
  Stack,
  Title,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { formatSql } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

export function DetailQuery({ query }: { query: string }) {
  const formattedSQL = useMemo(() => formatSql(query), [query])

  return (
    <Card shadow="xs" p="xl">
      <Stack spacing="xs">
        <Title order={5}>Query</Title>

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