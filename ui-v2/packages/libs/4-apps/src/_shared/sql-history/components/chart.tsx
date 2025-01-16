import {
  SeriesChart,
  SeriesData,
} from "@pingcap-incubator/tidb-dashboard-lib-charts"
import {
  TimeRangeValue,
  toTimeRangeValue,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box, Flex, Loader, useComputedColorScheme } from "@tidbcloud/uikit"
import { useMemo } from "react"

import { useSqlHistoryState } from "../shared-state/memory-state"
import { useSqlHistoryMetricData } from "../utils/use-data"

export function SqlHistoryChart() {
  const colorScheme = useComputedColorScheme()
  const { data: metricData, isLoading } = useSqlHistoryMetricData()
  const metric = useSqlHistoryState((state) => state.metric)
  const timeRange = useSqlHistoryState((state) => state.timeRange)
  const setTimeRange = useSqlHistoryState((state) => state.setTimeRange)
  const tr = useMemo<TimeRangeValue>(
    () => (timeRange ? toTimeRangeValue(timeRange) : [0, 0]),
    [timeRange],
  )

  const seriesData = useMemo<SeriesData[]>(() => {
    if (!metricData) return []
    return [
      {
        id: metric?.name || "",
        name: metric?.name || "",
        data: metricData || [],
      },
    ]
  }, [metricData, metric])

  function handleTimeRangeChange(v: TimeRangeValue) {
    setTimeRange({ type: "absolute", value: v })
  }

  return (
    <Box h={160}>
      {seriesData.length > 0 || !isLoading ? (
        <SeriesChart
          // key is needed to force re-render when switching metric, but why
          key={metric?.name}
          unit={metric?.unit || "short"}
          data={seriesData}
          timeRange={tr}
          theme={colorScheme}
          onBrush={handleTimeRangeChange}
        />
      ) : (
        <Flex h="100%" align="center" justify="center">
          <Loader size="xs" />
        </Flex>
      )}
    </Box>
  )
}
