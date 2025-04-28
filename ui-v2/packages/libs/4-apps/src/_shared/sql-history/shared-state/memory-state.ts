import {
  TimeRange,
  TimeRangeValue,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { create } from "zustand"

import { HistoryMetricItem } from "../ctx"

interface SqlHistoryState {
  timeRange: TimeRange | undefined
  setTimeRange: (timeRange: TimeRange | undefined) => void

  metric: HistoryMetricItem | undefined
  setMetric: (metric: HistoryMetricItem | undefined) => void

  reset: () => void
}

export const useSqlHistoryState = create<SqlHistoryState>((set) => ({
  timeRange: undefined,
  setTimeRange: (timeRange: TimeRange | undefined) => set({ timeRange }),

  metric: undefined,
  setMetric: (metric: HistoryMetricItem | undefined) => set({ metric }),

  reset: () => set({ timeRange: undefined, metric: undefined }),
}))

//----------------------------------------------

// when get slow query list data, the time range can't beyond max 24 hours
// if that, we should clip the time range and show a alert
interface TimeRangeValueState {
  trv: TimeRangeValue
  beyondMax: boolean
  setTRV: (newTRV: TimeRangeValue, beyondMax?: boolean) => void
}

export const useTimeRangeValueState = create<TimeRangeValueState>((set) => ({
  trv: [0, 0],
  beyondMax: false,
  setTRV: (newTRV, beyondMax) => set({ trv: newTRV, beyondMax }),
}))
