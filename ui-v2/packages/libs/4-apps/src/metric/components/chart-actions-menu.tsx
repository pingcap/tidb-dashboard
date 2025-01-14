import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ActionIcon, Menu } from "@tidbcloud/uikit"
import { IconDotsHorizontal } from "@tidbcloud/uikit/icons"

export function ChartActionsMenu({ onHide }: { onHide: () => void }) {
  const { tt } = useTn("metric")

  return (
    <Menu>
      <Menu.Target>
        <ActionIcon variant="transparent" aria-label="metrics chart actions">
          <IconDotsHorizontal size={16} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item onClick={onHide}>{tt("Hide")}</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
