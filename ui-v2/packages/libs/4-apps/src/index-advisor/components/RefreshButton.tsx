import { ActionIcon, Box } from "@tidbcloud/uikit"
import { IconRefreshCw02 } from "@tidbcloud/uikit/icons"

import { useAdvisorsData } from "../utils/use-data"

export function RefreshButton() {
  const { refetch: reloadAdvisors } = useAdvisorsData()

  return (
    <Box ml="auto">
      <ActionIcon
        variant="transparent"
        color="gray"
        onClick={() => {
          reloadAdvisors()
        }}
      >
        <IconRefreshCw02 size={16} />
      </ActionIcon>
    </Box>
  )
}
