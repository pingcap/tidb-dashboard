import { TimeRangePicker } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Box, Group, Select } from "@tidbcloud/uikit"
import { dayjs } from "@tidbcloud/uikit/utils"

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
      comboboxProps={{ shadow: "md" }}
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
          .startOf("d")
          .toDate()
      }
      maxDateTime={() => dayjs().endOf("d").toDate()}
    />
  )

  return (
    <Group>
      {instanceSelect}

      <Box ml="auto">{timeRangePicker}</Box>
    </Group>
  )
}
