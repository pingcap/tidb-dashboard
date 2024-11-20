import { IconRefreshCw02 } from "@pingcap-incubator/tidb-dashboard-lib-icons"
import {
  ActionIcon,
  Box,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

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
