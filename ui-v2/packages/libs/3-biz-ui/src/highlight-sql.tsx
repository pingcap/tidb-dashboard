import { formatSql } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, CodeHighlight } from "@tidbcloud/uikit"
import React, { useMemo } from "react"

interface Props {
  sql: string
  compact?: boolean
}

function HighlightSQL({ sql, compact = false }: Props) {
  const formattedSql = useMemo(() => {
    return formatSql(sql, compact)
  }, [sql, compact])

  const highlighter = (
    <CodeHighlight
      withCopyButton={!compact}
      code={formattedSql}
      styles={{
        root: {
          backgroundColor: "transparent",
        },
        pre: {
          padding: 0,
        },
        code: {
          padding: 0,
          fontSize: compact ? 13 : 12,
          ...(compact
            ? {
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }
            : {}),
        },
      }}
    />
  )

  if (compact) {
    return highlighter
  }

  return (
    <Box mah="90vh" sx={{ overflow: "auto" }}>
      {highlighter}
    </Box>
  )
}

export default React.memo(HighlightSQL)
