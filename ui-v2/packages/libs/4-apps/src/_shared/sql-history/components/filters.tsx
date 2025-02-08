import { TimeRangePicker } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn as useTnx } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Group, Select } from "@tidbcloud/uikit"
import { dayjs } from "@tidbcloud/uikit/utils"
import { useEffect, useMemo } from "react"

import { useAppContext } from "../ctx"
import { useSqlHistoryState } from "../shared-state/memory-state"
import { useSqlHistoryMetricNamesData } from "../utils/use-data"

const QUICK_RANGES: number[] = [
  5 * 60, // 5 mins
  15 * 60,
  30 * 60,
  60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
  2 * 24 * 60 * 60,
  3 * 24 * 60 * 60, // 3 days
  7 * 24 * 60 * 60, // 7 days
]

function MetricSelect() {
  const ctx = useAppContext()
  // rename useTn to useTnx to avoid run `pnpm gen:locales` fail
  const { tk } = useTnx(ctx.cfg.parentAppName)
  const { data: metrics } = useSqlHistoryMetricNamesData()
  const metric = useSqlHistoryState((state) => state.metric)
  const setMetric = useSqlHistoryState((state) => state.setMetric)
  useEffect(() => {
    if (metrics && !metric) {
      setMetric(metrics[0])
    }
  }, [metrics])

  const selectData = useMemo(
    () =>
      metrics?.map((m) => ({
        label: tk(`fields.${m.name}`, m.name),
        value: m.name,
      })),
    [metrics, tk],
  )

  function handleMetricChange(v: string | null) {
    const metric = metrics?.find((m) => m.name === v)
    setMetric(metric)
  }

  return (
    <Select
      data={selectData}
      value={metric && metric.name}
      onChange={handleMetricChange}
    />
  )
}

function TimeRangeSelect() {
  const ctx = useAppContext()
  const timeRange = useSqlHistoryState((state) => state.timeRange)
  const setTimeRange = useSqlHistoryState((state) => state.setTimeRange)
  useEffect(() => {
    if (!timeRange) {
      setTimeRange(ctx.cfg.initialTimeRange)
    }
  }, [timeRange])

  return (
    <TimeRangePicker
      value={timeRange || ctx.cfg.initialTimeRange}
      onChange={setTimeRange}
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
}

export function Filters() {
  return (
    <Group>
      <MetricSelect />
      <TimeRangeSelect />
    </Group>
  )
}
