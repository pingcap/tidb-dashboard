import {
  AutoRefreshButton,
  AutoRefreshButtonRef,
  DEFAULT_AUTO_REFRESH_SECONDS,
  TimeRangePicker,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Group } from "@tidbcloud/uikit"
import { dayjs } from "@tidbcloud/uikit/utils"
import { useRef, useState } from "react"

import { useMetricsUrlState } from "../../shared-state/url-state"
import { QUICK_RANGES } from "../../utils/constants"

// @todo: maybe it should be named Toolbar instead of Filters
export function Filters() {
  const { timeRange, setTimeRange, setRefresh } = useMetricsUrlState()
  const [autoRefreshValue, setAutoRefreshValue] = useState<number>(
    DEFAULT_AUTO_REFRESH_SECONDS,
  )
  const autoRefreshRef = useRef<AutoRefreshButtonRef>(null)
  const [loading, setLoading] = useState(false)

  function handleRefresh() {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 1000)
    setRefresh()
  }

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
    <Group ml="auto">
      {timeRangePicker}
      {autoRefreshButton}
    </Group>
  )
}
