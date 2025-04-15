import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ActionIcon, Menu, Stack, Typography } from "@tidbcloud/uikit"
import {
  IconDotsHorizontal,
  IconEyeOff,
  IconRefreshCw02,
} from "@tidbcloud/uikit/icons"

export function ChartActionsMenu({
  promAddr,
  showHide,
  onHide,
  onRefresh,
}: {
  promAddr?: string
  showHide?: boolean
  onHide: () => void
  onRefresh: () => void
}) {
  const { tt } = useTn("metric")

  return (
    <Menu>
      <Menu.Target>
        <ActionIcon variant="transparent" aria-label="metrics chart actions">
          <IconDotsHorizontal size={16} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        {promAddr && (
          <>
            <Stack gap={2} py={8} px={12}>
              <Typography c="carbon.6" fw={500} fz={12}>
                {tt("Prometheus Address")}
              </Typography>
              <Typography>{promAddr}</Typography>
            </Stack>
            <Menu.Divider />
          </>
        )}
        <Menu.Item
          leftSection={<IconRefreshCw02 size={16} />}
          onClick={onRefresh}
        >
          {tt("Refresh")}
        </Menu.Item>
        {showHide && (
          <Menu.Item leftSection={<IconEyeOff size={16} />} onClick={onHide}>
            {tt("Hide")}
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  )
}
