import { IconRefreshCw02 } from "@pingcap-incubator/tidb-dashboard-lib-icons"
import {
  ActionIcon,
  Box,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

import { useListData } from "../utils/use-data"

export function RefreshButton() {
  const { refetch: reloadList } = useListData()

  return (
    <Box ml="auto">
      <ActionIcon
        variant="transparent"
        color="gray"
        onClick={() => {
          reloadList()
        }}
      >
        <IconRefreshCw02 size={16} />
      </ActionIcon>
    </Box>
  )
}
