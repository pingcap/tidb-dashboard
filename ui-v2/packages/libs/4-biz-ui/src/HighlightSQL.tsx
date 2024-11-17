import { formatSql } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box } from "@tidbcloud/uikit"
import React, { useMemo } from "react"

interface Props {
  sql: string
  compact?: boolean
}

function HighlightSQL({ sql, compact = false }: Props) {
  const formattedSql = useMemo(() => {
    return formatSql(sql, compact)
  }, [sql, compact])

  return (
    <Box mah="90vh" sx={{ overflow: "auto" }}>
      {formattedSql}
      {/* <Prism
        language="sql"
        styles={{
          code: {
            backgroundColor: "transparent !important",
            padding: 0,
            fontSize: compact ? 13 : 12,
          },
          line: {
            padding: 0,
          },
          lineContent: compact
            ? {
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }
            : {},
        }}
      >
        {formattedSql}
      </Prism> */}
    </Box>
  )
}

export default React.memo(HighlightSQL)
