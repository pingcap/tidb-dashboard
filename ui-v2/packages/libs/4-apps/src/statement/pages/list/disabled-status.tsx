import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Button, Card, Stack, Title, Typography } from "@tidbcloud/uikit"

import { useSettingDrawerState } from "../../shared-state/memory-state"

export function DisabledStatusCard() {
  const { tt } = useTn("statement")
  const setSettingDrawerVisible = useSettingDrawerState((s) => s.setVisible)

  return (
    <Card shadow="none" h={200}>
      <Stack justify="center" align="center" h="100%">
        <Title order={4}>{tt("Feature Not Enabled")}</Title>
        <Typography c="dimmed">
          {tt(
            "Statement feature is not enabled so that statement history cannot be viewed. You can modify settings to enable the feature and wait for new data being collected.",
          )}
        </Typography>
        <Button onClick={() => setSettingDrawerVisible(true)}>
          {tt("Open Setting")}
        </Button>
      </Stack>
    </Card>
  )
}
