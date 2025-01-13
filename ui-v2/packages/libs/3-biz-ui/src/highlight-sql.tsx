import { formatSql } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, Prism } from "@tidbcloud/uikit"
import React, { useMemo } from "react"

function InlineHighlightSQL({ sql }: { sql: string }) {
  const formattedSql = useMemo(() => {
    return formatSql(sql, true)
  }, [sql])

  return (
    <Prism
      noCopy
      language="sql"
      styles={{
        scrollArea: {
          "& > div > div": {
            display: "block !important",
          },
        },
        code: {
          backgroundColor: "transparent !important",
          padding: 0,
          fontSize: 13,
        },
        line: {
          padding: 0,
        },
        lineContent: {
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        },
      }}
    >
      {formattedSql}
    </Prism>
  )
}

function HighlightSQL({ sql }: { sql: string }) {
  const formattedSql = useMemo(() => {
    return formatSql(sql, false)
  }, [sql])

  return (
    <Box mah="90vh" maw="60vw" sx={{ overflow: "auto" }}>
      <Prism
        language="sql"
        styles={{
          copy: {
            top: 0,
            right: 0,
          },
          code: {
            backgroundColor: "transparent !important",
            padding: 0,
            paddingRight: 24,
            paddingTop: 3,
            fontSize: 12,
          },
          line: {
            padding: 0,
          },
        }}
      >
        {formattedSql}
      </Prism>
    </Box>
  )
}

const _InlineHighlightSQL = React.memo(InlineHighlightSQL)
const _HighlightSQL = React.memo(HighlightSQL)

export {
  _InlineHighlightSQL as InlineHighlightSQL,
  _HighlightSQL as HighlightSQL,
}
