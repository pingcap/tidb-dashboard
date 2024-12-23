import { formatSql } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, CodeHighlight, InlineCodeHighlight } from "@tidbcloud/uikit"
import React, { useMemo } from "react"

function InlineHighlightSQL({ sql }: { sql: string }) {
  const formattedSql = useMemo(() => {
    return formatSql(sql, true)
  }, [sql])

  return (
    <InlineCodeHighlight
      code={formattedSql}
      styles={{
        code: {
          display: "block",
          width: "100%",
          backgroundColor: "transparent",
          padding: 0,
          fontSize: 13,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        },
      }}
    />
  )
}

function HighlightSQL({ sql }: { sql: string }) {
  const formattedSql = useMemo(() => {
    return formatSql(sql, false)
  }, [sql])

  return (
    <Box mah="90vh" sx={{ overflow: "auto" }}>
      <CodeHighlight
        withCopyButton={true}
        code={formattedSql}
        styles={{
          root: {
            backgroundColor: "transparent",
          },
          pre: {
            padding: 0,
            paddingRight: 24,
          },
          code: {
            padding: 0,
            fontSize: 12,
          },
          copy: {
            top: 0,
            right: 0,
          },
        }}
      />
    </Box>
  )
}

const _InlineHighlightSQL = React.memo(InlineHighlightSQL)
const _HighlightSQL = React.memo(HighlightSQL)

export {
  _InlineHighlightSQL as InlineHighlightSQL,
  _HighlightSQL as HighlightSQL,
}
