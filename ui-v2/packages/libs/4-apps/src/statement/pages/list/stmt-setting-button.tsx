import { ActionIcon } from "@tidbcloud/uikit"
import { IconSettings01 } from "@tidbcloud/uikit/icons"
import { useState } from "react"

import { StatementSettingDrawer } from "../setting"

export function StatementSettingButton() {
  const [visible, setVisible] = useState(false)

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
