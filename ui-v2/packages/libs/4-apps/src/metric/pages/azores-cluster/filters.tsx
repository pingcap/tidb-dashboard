import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Group, SegmentedControl } from "@tidbcloud/uikit"
import { TimeRangePicker } from "@tidbcloud/uikit/biz"
import dayjs from "dayjs"

import { useMetricsUrlState } from "../../url-state"

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

const GROUPS = ["basic", "advanced", "resource"]

// @ts-expect-error @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useLocales() {
  const { tk } = useTn("metric")
  // for gogocode to scan and generate en.json before build
  tk("groups.basic", "Basic")
  tk("groups.advanced", "Advanced")
  tk("groups.resource", "Resource")
}

export function Filters() {
  const { tk } = useTn("metric")
  const { panel, timeRange, setTimeRange, setQueryParams } =
    useMetricsUrlState()
  const tabs = GROUPS?.map((p) => ({
    label: tk(`groups.${p}`),
    value: p,
  }))

  function handlePanelChange(newPanel: string) {
    setQueryParams({
      panel: newPanel || undefined,
      refresh: new Date().valueOf().toString(),
    })
  }

  const panelSwitch = tabs && tabs.length > 0 && (
    <SegmentedControl
      withItemsBorders={false}
      data={tabs}
      value={panel || tabs[0].value}
      onChange={handlePanelChange}
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
