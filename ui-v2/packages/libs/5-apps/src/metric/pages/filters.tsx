import { TimeRangePicker } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  Group,
  SegmentedControl,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import dayjs from "dayjs"

import { useAppContext } from "../ctx"
import { useMetricsUrlState } from "../url-state"

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

export function Filters() {
  const ctx = useAppContext()
  const { panel, setPanel, timeRange, setTimeRange } = useMetricsUrlState()

  const tabs = ctx.cfg.metricQueriesConfig.map((p) => ({
    label: p.category,
    value: p.category,
  }))

  const panelSwitch = (
    <SegmentedControl
      data={tabs}
      value={panel || tabs[0].value}
      onChange={setPanel}
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
      {panelSwitch}

      <Group ml="auto">{timeRangePicker}</Group>
    </Group>
  )
}
