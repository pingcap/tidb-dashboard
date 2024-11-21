import {
  AutoRefreshButton,
  AutoRefreshButtonRef,
  DEFAULT_AUTO_REFRESH_SECONDS,
  TimeRangePicker,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  Group,
  SegmentedControl,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import dayjs from "dayjs"
import { useRef, useState } from "react"

import { useMetricsUrlState } from "../../url-state"
import { useMetricQueriesConfigData } from "../../utils/use-data"

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
  const { panel, timeRange, setTimeRange, setRefresh, setQueryParams } =
    useMetricsUrlState()
  const { data: panelConfigData } = useMetricQueriesConfigData("normal")
  const tabs = panelConfigData?.map((p) => ({
    label: p.displayName,
    value: p.category,
  }))

  const [autoRefreshValue, setAutoRefreshValue] = useState<number>(
    DEFAULT_AUTO_REFRESH_SECONDS,
  )
  const autoRefreshRef = useRef<AutoRefreshButtonRef>(null)
  const [loading, setLoading] = useState(false)

  function handlePanelChange(newPanel: string) {
    autoRefreshRef.current?.refresh()
    setQueryParams({
      panel: newPanel || undefined,
      refresh: new Date().valueOf().toString(),
    })
  }

  function handleRefresh() {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 1000)
    setRefresh()
  }

  const panelSwitch = tabs && tabs.length > 0 && (
    <SegmentedControl
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

  const autoRefreshButton = (
    <AutoRefreshButton
      ref={autoRefreshRef}
      autoRefreshValue={autoRefreshValue}
      onAutoRefreshChange={setAutoRefreshValue}
      onRefresh={handleRefresh}
      loading={loading}
    />
  )

  return (
    <Group>
      {panelSwitch}

      <Group ml="auto">
        {timeRangePicker}
        {autoRefreshButton}
      </Group>
    </Group>
  )
}
