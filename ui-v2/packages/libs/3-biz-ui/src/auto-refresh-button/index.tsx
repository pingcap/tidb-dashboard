import { formatNumByUnit } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Button, Menu, Text, Tooltip } from "@tidbcloud/uikit"
import {
  IconChevronSelectorVertical,
  IconRefreshCw01,
} from "@tidbcloud/uikit/icons"
import { useRafInterval } from "ahooks"
import { forwardRef, useImperativeHandle, useMemo, useState } from "react"

import { RefreshProgress } from "./progress"

interface AutoRefreshButtonProps {
  autoRefreshValue?: number
  autoRefreshOptions?: number[]
  onAutoRefreshChange?: (v: number) => void
  onRefresh?: () => void
  loading?: boolean
  disabled?: boolean
}

export interface AutoRefreshButtonRef {
  refresh: () => void
}

const AUTO_REFRESH_SECONDS_OPTIONS = [
  30,
  60,
  5 * 60,
  15 * 60,
  30 * 60,
  60 * 60,
  2 * 60 * 60,
]

export const DEFAULT_AUTO_REFRESH_SECONDS = 60

const AutoRefreshButton = forwardRef<
  AutoRefreshButtonRef,
  AutoRefreshButtonProps
>(
  (
    {
      autoRefreshValue = DEFAULT_AUTO_REFRESH_SECONDS,
      autoRefreshOptions = AUTO_REFRESH_SECONDS_OPTIONS,
      onAutoRefreshChange,
      onRefresh,
      loading,
      disabled,
    },
    ref,
  ) => {
    const selectedOption = useMemo(
      () => autoRefreshOptions.find((op) => op === autoRefreshValue),
      [autoRefreshValue, autoRefreshOptions],
    )
    const [remaining, setRemaining] = useState<number>(autoRefreshValue)
    const [menuOpened, setMenuOpened] = useState(false)

    // useRafInterval stops running when browser render doesn't work, for example, browser tab is not active, browser window is minimized.
    useRafInterval(() => {
      if (disabled || autoRefreshValue === 0) {
        return
      }
      setRemaining((r) => {
        const newRemaining = r - 1
        if (newRemaining === 0) {
          handleRefresh()
        }
        return newRemaining
      })
    }, 1000)

    const handleRefresh = async () => {
      if (disabled) {
        return
      }
      setRemaining(autoRefreshValue)
      onRefresh?.()
    }

    useImperativeHandle(ref, () => ({
      refresh: handleRefresh,
    }))

    const handleAutoRefreshChange = (v: number) => {
      onAutoRefreshChange?.(v)
      setRemaining(v)
    }

    return (
      <Button.Group>
        <Button
          variant="default"
          px={12}
          styles={(theme) => ({
            root: {
              backgroundColor: theme.colors.carbon[0],
              borderColor: theme.colors.carbon[4],
              "&:hover": {
                backgroundColor: theme.colors.carbon[0],
                borderColor: theme.colors.carbon[5],
              },
            },
            label: { fontWeight: 400 },
          })}
          onClick={handleRefresh}
          leftSection={
            autoRefreshValue && !disabled ? (
              <RefreshProgress
                value={Math.floor(
                  ((autoRefreshValue - remaining) / autoRefreshValue) * 100,
                )}
              />
            ) : (
              <IconRefreshCw01 size={16} />
            )
          }
          loading={loading}
          loaderProps={{ size: 16 }}
          disabled={disabled}
        >
          Refresh
        </Button>

        <Menu
          position="bottom-end"
          offset={4}
          width={110}
          opened={menuOpened}
          onChange={setMenuOpened}
        >
          <Menu.Target>
            <Tooltip disabled={!!autoRefreshValue} label="Auto Refresh: Off">
              <Button
                disabled={disabled || loading}
                variant="default"
                styles={(theme) => ({
                  root: {
                    backgroundColor: theme.colors.carbon[0],
                    borderColor: menuOpened
                      ? theme.colors.carbon[9]
                      : theme.colors.carbon[4],
                    "&:hover": {
                      backgroundColor: theme.colors.carbon[0],
                      borderColor: menuOpened
                        ? theme.colors.carbon[9]
                        : theme.colors.carbon[5],
                    },
                    "&:active": { transform: "none" },
                  },
                  label: { fontWeight: 400 },
                })}
                px={12}
              >
                {!!autoRefreshValue && (
                  <Text mr={8}>
                    {formatNumByUnit(autoRefreshValue, "s", 0)}
                  </Text>
                )}

                <IconChevronSelectorVertical size={16} />
              </Button>
            </Tooltip>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Auto Refresh</Menu.Label>
            <Menu.Item
              sx={(theme) => ({
                background: !selectedOption
                  ? theme.colors.carbon[3]
                  : undefined,
              })}
              onClick={() => handleAutoRefreshChange(0)}
            >
              Off
            </Menu.Item>

            <Menu.Divider />

            <>
              {autoRefreshOptions.map((seconds) => (
                <Menu.Item
                  key={seconds}
                  sx={(theme) => ({
                    background:
                      seconds === selectedOption
                        ? theme.colors.carbon[3]
                        : undefined,
                  })}
                  onClick={() => handleAutoRefreshChange(seconds)}
                >
                  {formatNumByUnit(seconds, "s", 0)}
                </Menu.Item>
              ))}
            </>
          </Menu.Dropdown>
        </Menu>
      </Button.Group>
    )
  },
)

export { AutoRefreshButton }
