import {
  AutoRefreshButton,
  AutoRefreshButtonRef,
  DEFAULT_AUTO_REFRESH_SECONDS,
  TimeRangePicker,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Group, SegmentedControl } from "@tidbcloud/uikit"
import { dayjs } from "@tidbcloud/uikit/utils"
import { useRef, useState } from "react"

import { useMetricsUrlState } from "../../shared-state/url-state"
import { QUICK_RANGES } from "../../utils/constants"
import { useMetricQueriesConfigData } from "../../utils/use-data"

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
