import { ActionIcon } from "@tidbcloud/uikit"
import { IconRefreshCw02 } from "@tidbcloud/uikit/icons"

import { useListData } from "../../utils/use-data"

export function RefreshButton() {
  const { refetch: reloadList } = useListData()

  return (
    <ActionIcon
      variant="transparent"
      color="gray"
      onClick={() => {
        reloadList()
      }}
    >
      <IconRefreshCw02 size={16} />
    </ActionIcon>
  )
}
