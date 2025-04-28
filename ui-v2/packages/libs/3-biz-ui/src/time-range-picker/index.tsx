import {
  RelativeTimeRange,
  TimeRange,
  addLangsLocales,
  formatDuration,
  formatTime,
  toTimeRangeValue,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Box,
  Button,
  ButtonProps,
  Group,
  Menu,
  Text,
  Tooltip,
  Typography,
} from "@tidbcloud/uikit"
import { IconChevronRight } from "@tidbcloud/uikit/icons"
import { useMemo, useState } from "react"

import CustomTimeRangePicker from "./custom"

const DEFAULT_QUICK_RANGES = [
  5 * 60,
  15 * 60,
  30 * 60,
  60 * 60,
  3 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
  2 * 24 * 60 * 60,
  3 * 24 * 60 * 60,
]

export interface TimeRangePickerProps extends ButtonProps {
  value: TimeRange
  onChange?: (value: TimeRange) => void

  loading?: boolean

  minDateTime?: () => Date
  maxDateTime?: () => Date
  maxDuration?: number // unit: seconds

  // quick range selection items, Last x mins, Last x hours...
  // unit: seconds.
  quickRanges?: number[]
  quickRangesType?: RelativeTimeRange["type"]
  disableAbsoluteRanges?: boolean
}

export const TimeRangePicker = ({
  value,
  minDateTime,
  maxDateTime,
  maxDuration,
  disableAbsoluteRanges = false,
  onChange,
  quickRanges = DEFAULT_QUICK_RANGES,
  quickRangesType = "relative",
  loading,
  sx,
}: React.PropsWithChildren<TimeRangePickerProps>) => {
  const { tt } = useTn("time-range-picker")
  const [opened, setOpened] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const isRelativeRange = value.type !== "absolute"
  const relativeTimePrefix =
    value.type === "now-to-future" ? tt("Next") : tt("Past")

  const timeRangeValue = toTimeRangeValue(value)
  const duration = timeRangeValue[1] - timeRangeValue[0]
  const selectedRelativeItem = useMemo(() => {
    if (value.type === "absolute") {
      return
    }
    return quickRanges.find(
      (it) => it === value.value && value.type === quickRangesType,
    )
  }, [quickRanges, value, quickRangesType])

  const formattedAbsDateTime = useMemo(() => {
    return `${formatTime(timeRangeValue[0] * 1000, "MMM D, YYYY HH:mm")} - ${formatTime(
      timeRangeValue[1] * 1000,
      "MMM D, YYYY HH:mm",
    )}`
  }, [timeRangeValue])

  return (
    <Menu
      shadow="md"
      width={customMode ? "auto" : disableAbsoluteRanges ? 200 : 280}
      position="bottom-end"
      opened={opened}
      onOpen={() => {
        setOpened(true)
        setCustomMode(false)
      }}
      onClose={() => setOpened(false)}
    >
      <Menu.Target>
        <Tooltip
          label={formattedAbsDateTime}
          disabled={isRelativeRange}
          withArrow
        >
          <Button
            variant="default"
            bg="carbon.0"
            styles={(theme) => ({
              root: {
                paddingLeft: "12px",
                paddingRight: "12px",
                borderColor: opened
                  ? theme.colors.carbon[9]
                  : theme.colors.carbon[4],
                "&:hover": {
                  backgroundColor: theme.colors.carbon[0],
                  borderColor: opened
                    ? theme.colors.carbon[9]
                    : theme.colors.carbon[5],
                },
                "&:active": { transform: "none" },
              },
              inner: {
                width: "100%",
              },
              label: {
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                fontWeight: 400,
              },
            })}
            w={disableAbsoluteRanges ? 200 : 280}
            sx={sx}
            loading={loading}
          >
            <Group w="100%" gap={0}>
              <Box sx={{ flex: "none" }}>
                <DurationBadge>{formatDuration(duration, true)}</DurationBadge>
              </Box>
              <Text
                px={8}
                sx={{
                  flex: "1 1",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  textAlign: "left",
                }}
              >
                {isRelativeRange
                  ? `${relativeTimePrefix} ${formatDuration(duration)}`
                  : formattedAbsDateTime}
              </Text>
            </Group>
          </Button>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        {customMode ? (
          <CustomTimeRangePicker
            value={timeRangeValue}
            minDateTime={minDateTime?.()}
            maxDateTime={maxDateTime?.()}
            maxDuration={maxDuration}
            onChange={(v) => {
              onChange?.(v)
              setOpened(false)
            }}
            onCancel={() => setOpened(false)}
            onReturnClick={() => setCustomMode(false)}
          />
        ) : (
          <>
            {!disableAbsoluteRanges && (
              <>
                <Menu.Item
                  rightSection={<IconChevronRight size={16} />}
                  closeMenuOnClick={false}
                  onClick={() => setCustomMode(true)}
                >
                  <Typography variant="body-lg">{tt("Custom")}</Typography>
                </Menu.Item>

                <Menu.Divider />
              </>
            )}

            <>
              {quickRanges.map((seconds) => (
                <Menu.Item
                  key={seconds}
                  sx={(theme) => ({
                    background:
                      seconds === selectedRelativeItem
                        ? theme.colors.carbon[3]
                        : "",
                  })}
                  onClick={() =>
                    onChange?.({ type: quickRangesType, value: seconds })
                  }
                >
                  <Text>
                    {relativeTimePrefix} {formatDuration(seconds)}
                  </Text>
                </Menu.Item>
              ))}
            </>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  )
}

const DurationBadge = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box
      display="inline-block"
      w={35}
      py={3}
      bg="carbon.3"
      c="carbon.8"
      fz={10}
      lh="14px"
      ta="center"
      sx={{ borderRadius: 8 }}
    >
      {children}
    </Box>
  )
}

//------------------------
// i18n
// auto updated by running `pnpm gen:locales`

const I18nNamespace = "time-range-picker"
type I18nLocaleKeys =
  | "Apply"
  | "Back"
  | "Cancel"
  | "Custom"
  | "End"
  | "Next"
  | "Past"
  | "Please select a start time after {{time}}."
  | "Please select an end time after the start time."
  | "Please select an end time before {{time}}."
  | "Start"
  | "The selection exceeds the {{duration}} limit, please select a shorter time range."
type I18nLocale = {
  [K in I18nLocaleKeys]?: string
}
const en: I18nLocale = {}
const zh: I18nLocale = {
  Apply: "应用",
  Back: "返回",
  Cancel: "取消",
  Custom: "自定义",
  End: "结束",
  Next: "未来",
  Past: "过去",
  "Please select a start time after {{time}}.":
    "请选择 {{time}} 之后的开始时间。",
  "Please select an end time after the start time.":
    "请确保结束时间在开始时间之后。",
  "Please select an end time before {{time}}.":
    "请选择 {{time}} 之前的结束时间。",
  Start: "开始",
  "The selection exceeds the {{duration}} limit, please select a shorter time range.":
    "选择超出了 {{duration}} 的限制，请选择更短的时间范围。",
}

function updateI18nLocales(locales: { [ln: string]: I18nLocale }) {
  for (const [ln, locale] of Object.entries(locales)) {
    addLangsLocales({
      [ln]: {
        __namespace__: I18nNamespace,
        ...locale,
      },
    })
  }
}

updateI18nLocales({ en, zh })

TimeRangePicker.i18nNamespace = I18nNamespace
TimeRangePicker.updateI18nLocales = updateI18nLocales
