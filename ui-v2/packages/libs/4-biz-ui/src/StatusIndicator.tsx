import { Box, Group } from "@tidbcloud/uikit"
import { LabelTooltip } from "@tidbcloud/uikit/biz"
import React from "react"

export const StatusIndicator: React.FC<
  React.PropsWithChildren<{
    label: string
    dotColor: string
    dotFill?: boolean
    tip?: string
  }>
> = ({ label, dotColor, dotFill = false, tip }) => {
  return (
    <Group spacing={0} p={4} align="center">
      <Box
        w={8}
        h={8}
        mr={8}
        sx={{ borderRadius: "50%", border: `1px solid ${dotColor}` }}
        bg={dotFill ? dotColor : "transparent"}
      />
      {/* must use `span`, can't use `Typography` here, else the selected item can't be highlighted */}
      <span>{label}</span>
      {tip && <LabelTooltip label={tip} />}
    </Group>
  )
}
