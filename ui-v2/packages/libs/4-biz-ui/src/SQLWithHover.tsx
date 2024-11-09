import { Box, HoverCard, HoverCardProps, Text } from "@tidbcloud/uikit"
import { useMemo } from "react"

import HighlightSQL from "./HighlightSQL"

export function SQLWithHover({
  sql,
  position,
}: {
  sql: string
  position?: HoverCardProps["position"]
}) {
  const truncSQLShort = useMemo(() => {
    return sql.length <= 200 ? sql : sql.slice(0, 200) + "..."
  }, [sql])
  const truncSQLLong = useMemo(() => {
    return sql.length <= 1000 ? sql : sql.slice(0, 1000) + "..."
  }, [sql])

  return (
    <HoverCard
      withinPortal
      withArrow
      position={position || "right"}
      shadow="md"
    >
      <HoverCard.Target>
        <Box>
          <HighlightSQL sql={truncSQLShort} compact />
        </Box>
      </HoverCard.Target>
      <HoverCard.Dropdown onClick={(e) => e.stopPropagation()}>
        <HighlightSQL sql={truncSQLLong} />
      </HoverCard.Dropdown>
    </HoverCard>
  )
}

// the evicted record's digest is empty string
export function EvictedSQL() {
  return (
    <HoverCard withinPortal withArrow position="right" shadow="md">
      <HoverCard.Target>
        <Text color="dimmed" italic>
          Others
        </Text>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Text>All of other dropped SQL statements</Text>
      </HoverCard.Dropdown>
    </HoverCard>
  )
}
