import { ActionIcon } from "@tidbcloud/uikit"
import { IconSettings01 } from "@tidbcloud/uikit/icons"

import { useSettingDrawerState } from "../../shared-state/memory-state"
import { StatementSettingDrawer } from "../setting"

export function StatementSettingButton() {
  const visible = useSettingDrawerState((s) => s.visible)
  const setVisible = useSettingDrawerState((s) => s.setVisible)

  return (
    <>
      <ActionIcon onClick={() => setVisible(true)}>
        <IconSettings01 size={16} />
      </ActionIcon>

      <StatementSettingDrawer
        visible={visible}
        onClose={() => setVisible(false)}
      />
    </>
  )
}
