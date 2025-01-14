import {
  AutoRefreshButton,
  AutoRefreshButtonRef,
  DEFAULT_AUTO_REFRESH_SECONDS,
  TimeRangePicker,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  toURLTimeRange,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Anchor, Group, SegmentedControl } from "@tidbcloud/uikit"
import { dayjs } from "@tidbcloud/uikit/utils"
import { useMemo, useRef, useState } from "react"

import { useAppContext } from "../../ctx"
import { useMetricsUrlState } from "../../shared-state/url-state"
import { QUICK_RANGES } from "../../utils/constants"

const GROUPS = ["basic", "resource", "advanced"]

// @ts-expect-error @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useLocales() {
  const { tk } = useTn("metric")
  // for gogocode to scan and generate en.json before build
  tk("groups.basic", "Basic")
  tk("groups.resource", "Resource")
  tk("groups.advanced", "Advanced")
}

// @todo: maybe it should be named Toolbar instead of Filters
export function Filters() {
  const { tk, tt } = useTn("metric")
  const ctx = useAppContext()
  const { panel, setQueryParams, timeRange, setTimeRange, setRefresh } =
    useMetricsUrlState()
  const tabs = GROUPS?.map((p) => ({
    label: tk(`groups.${p}`),
    value: p,
  }))

  const [autoRefreshValue, setAutoRefreshValue] = useState<number>(
    DEFAULT_AUTO_REFRESH_SECONDS,
  )
  const autoRefreshRef = useRef<AutoRefreshButtonRef>(null)
  const [loading, setLoading] = useState(false)

  const diagnosisLinkId = useMemo(() => {
    const { from, to } = toURLTimeRange(timeRange)
    return `${from},${to}`
  }, [timeRange])

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

  const diagnosisLink = (
    <Anchor
      onClick={() => {
        ctx.actions.openDiagnosis(diagnosisLinkId)
      }}
    >
      {tt("SQL Diagnosis")}
    </Anchor>
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
        {diagnosisLink}
        {timeRangePicker}
        {autoRefreshButton}
      </Group>
    </Group>
  )
}
