import { TimeRange } from "@pingcap-incubator/tidb-dashboard-lib-utils"
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
