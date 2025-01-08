import {
  TimeRangeUrlState,
  useTimeRangeUrlState,
  useUrlState,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback } from "react"

type MetricsUrlState = Partial<Record<"panel" | "refresh", string>> &
  TimeRangeUrlState

export function useMetricsUrlState() {
  const [queryParams, setQueryParams] = useUrlState<MetricsUrlState>()
  const { timeRange, setTimeRange } = useTimeRangeUrlState()

  const panel = queryParams.panel ?? ""
  const setPanel = useCallback(
    (newPanel: string) => {
      setQueryParams({ panel: newPanel || undefined })
    },
    [setQueryParams],
  )

  const refresh = queryParams.refresh ?? ""
  const setRefresh = useCallback(
    (v?: string) => {
      const now = new Date().valueOf().toString()
      setQueryParams({ refresh: `${v || ""}${now}` })
    },
    [setQueryParams],
  )

  return {
    panel,
    setPanel,

    timeRange,
    setTimeRange,

    refresh,
    setRefresh,

    queryParams,
    setQueryParams,
  }
}
