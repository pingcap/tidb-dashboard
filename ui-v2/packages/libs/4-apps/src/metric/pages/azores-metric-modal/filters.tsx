import { Box, Group, Select } from "@tidbcloud/uikit"
import { TimeRangePicker } from "@tidbcloud/uikit/biz"
import dayjs from "dayjs"

import { useChartState } from "../../shared-state/memory-state"
import { QUICK_RANGES } from "../../utils/constants"
import { useMetricLabelValuesData } from "../../utils/use-data"

export function Filters() {
  const timeRange = useChartState((state) => state.timeRange)
  const setTimeRange = useChartState((state) => state.setTimeRange)
  const selectedChart = useChartState((state) => state.selectedChart)
  const setSelectedLabelValue = useChartState(
    (state) => state.setSelectedLabelValue,
  )

  const { data: instancesData } = useMetricLabelValuesData(
    selectedChart?.metricName || "",
    "instance",
    timeRange,
  )

  const instanceSelect = (
    <Select
      w={280}
      placeholder="Select Instance"
      data={instancesData || []}
      clearable
      onChange={(v) => {
        setSelectedLabelValue(v ? `instance="${v}"` : undefined)
      }}
    />
  )

  const timeRangePicker = (
    <TimeRangePicker
      value={timeRange}
      onChange={(v) => {
        setTimeRange(v)
      }}
      quickRanges={QUICK_RANGES}
      minDateTime={() =>
        dayjs()
          .subtract(QUICK_RANGES[QUICK_RANGES.length - 1], "seconds")
          .toDate()
      }
      maxDateTime={() => dayjs().toDate()}
    />
  )

  return (
    <Group>
      {instanceSelect}

      <Box ml="auto">{timeRangePicker}</Box>
    </Group>
  )
}
