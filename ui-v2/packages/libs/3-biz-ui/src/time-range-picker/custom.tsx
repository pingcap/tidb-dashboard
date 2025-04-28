import {
  AbsoluteTimeRange,
  TimeRangeValue,
  formatDuration,
  formatTime,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Alert,
  Box,
  Button,
  DatePicker,
  Flex,
  Group,
  Input,
  Text,
  TimeInput,
  Typography,
} from "@tidbcloud/uikit"
import { IconAlertCircle, IconChevronLeft } from "@tidbcloud/uikit/icons"
import { dayjs } from "@tidbcloud/uikit/utils"
import { useMemo, useState } from "react"

interface CustomTimeRangePickerProps {
  value: TimeRangeValue
  minDateTime?: Date
  maxDateTime?: Date
  maxDuration?: number // unit: seconds
  onChange?: (v: AbsoluteTimeRange) => void
  onCancel?: () => void
  onReturnClick?: () => void
}

const CustomTimeRangePicker = ({
  value,
  maxDateTime,
  minDateTime,
  maxDuration,
  onChange,
  onCancel,
  onReturnClick,
}: CustomTimeRangePickerProps) => {
  const { tt } = useTn("time-range-picker")

  const [start, setStart] = useState(() => new Date(value[0] * 1000))
  const [end, setEnd] = useState(() => new Date(value[1] * 1000))
  const startTime = dayjs(start).format("HH:mm:ss")
  const endTime = dayjs(end).format("HH:mm:ss")

  const startAfterEnd = useMemo(() => {
    return start.valueOf() > end.valueOf()
  }, [start, end])
  const beyondMin = useMemo(() => {
    return minDateTime && start.valueOf() < minDateTime.valueOf()
  }, [minDateTime, start])
  const beyondMax = useMemo(() => {
    return maxDateTime && end.valueOf() > maxDateTime.valueOf()
  }, [maxDateTime, end])
  const beyondDuration = useMemo(() => {
    if (maxDuration !== undefined) {
      return end.valueOf() - start.valueOf() > maxDuration * 1000
    }
    return false
  }, [maxDuration, start, end])

  const [displayRangeDate, setDisplayRangeDate] = useState<
    [Date | null, Date | null]
  >([start, end])

  const updateRangeDate = (dates: [Date | null, Date | null]) => {
    setDisplayRangeDate(dates)

    if (dates[0]) {
      const newStart = new Date(dates[0])
      newStart.setHours(start.getHours())
      newStart.setMinutes(start.getMinutes())
      newStart.setSeconds(start.getSeconds())
      setStart(newStart)

      // to support to select the same day for start and end
      let newEnd = new Date(dates[0])
      if (dates[1]) {
        newEnd = new Date(dates[1])
      }
      newEnd.setHours(end.getHours())
      newEnd.setMinutes(end.getMinutes())
      newEnd.setSeconds(end.getSeconds())
      setEnd(newEnd)
    }
  }

  const updateTime = (v: string, k: "start" | "end") => {
    let setter = setStart
    if (k === "end") {
      setter = setEnd
    }
    setter((old) => {
      const d = dayjs(`2025-01-01 ${v}`, "YYYY-MM-DD HH:mm:ss").toDate()
      const newD = new Date(old!)
      newD.setHours(d.getHours())
      newD.setMinutes(d.getMinutes())
      newD.setSeconds(d.getSeconds())
      return newD
    })
  }
  const apply = () =>
    onChange?.({
      type: "absolute",
      value: [dayjs(start).unix(), dayjs(end).unix()],
    })

  return (
    <Box p={16} w={280} m={-4}>
      <Group onClick={onReturnClick} sx={{ cursor: "pointer" }}>
        <IconChevronLeft size={16} />
        <Typography variant="body-lg">{tt("Back")}</Typography>
      </Group>

      <Group gap={0} pt={8} justify="space-between">
        <Typography variant="label-sm">{tt("Start")}</Typography>
        <Group gap={8}>
          <Input
            w={116}
            value={dayjs(start).format("MMM D, YYYY")}
            onChange={() => {}}
            error={beyondMin || startAfterEnd || beyondDuration}
          />
          <TimeInput
            w={90}
            withSeconds
            value={startTime}
            onChange={(d) => updateTime(d.currentTarget.value, "start")}
            error={beyondMin || startAfterEnd || beyondDuration}
          />
        </Group>
      </Group>

      <Group gap={0} pt={8} justify="space-between">
        <Typography variant="label-sm">{tt("End")}</Typography>
        <Group gap={8}>
          <Input
            w={116}
            value={dayjs(end).format("MMM D, YYYY")}
            onChange={() => {}}
            error={beyondMax || startAfterEnd || beyondDuration}
          />
          <TimeInput
            w={90}
            withSeconds
            value={endTime}
            onChange={(d) => updateTime(d.currentTarget.value, "end")}
            error={beyondMax || startAfterEnd || beyondDuration}
          />
        </Group>
      </Group>

      <Flex justify="center" pt={8}>
        <DatePicker
          type="range"
          value={displayRangeDate}
          onChange={updateRangeDate}
          maxDate={maxDateTime}
          minDate={minDateTime}
        />
      </Flex>

      {(startAfterEnd || beyondMin || beyondMax || beyondDuration) && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" pt={8}>
          {startAfterEnd && (
            <Text c="red">
              {tt("Please select an end time after the start time.")}
            </Text>
          )}
          {beyondMin && (
            <Text c="red">
              {tt("Please select a start time after {{time}}.", {
                time: formatTime(minDateTime!, "MMM D, YYYY HH:mm:ss"),
              })}
            </Text>
          )}
          {beyondMax && (
            <Text c="red">
              {tt("Please select an end time before {{time}}.", {
                time: formatTime(maxDateTime!, "MMM D, YYYY HH:mm:ss"),
              })}
            </Text>
          )}
          {beyondDuration && (
            <Text c="red">
              {tt(
                "The selection exceeds the {{duration}} limit, please select a shorter time range.",
                { duration: formatDuration(maxDuration!) },
              )}
            </Text>
          )}
        </Alert>
      )}

      <Flex
        pt={8}
        gap="xs"
        justify="flex-end"
        align="flex-start"
        direction="row"
        wrap="wrap"
      >
        <Button size="xs" variant="default" onClick={onCancel}>
          {tt("Cancel")}
        </Button>
        <Button
          size="xs"
          onClick={apply}
          disabled={startAfterEnd || beyondMin || beyondMax || beyondDuration}
        >
          {tt("Apply")}
        </Button>
      </Flex>
    </Box>
  )
}

export default CustomTimeRangePicker
