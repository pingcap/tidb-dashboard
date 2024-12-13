import { TimeRange } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { create } from "zustand"

import { SingleChartConfig } from "../utils/type"

const DEF_TIME_RANGE: TimeRange = { type: "relative", value: 30 * 60 }

interface ChartState {
  selectedChart: SingleChartConfig | undefined
  setSelectedChart: (newChart: SingleChartConfig | undefined) => void

  timeRange: TimeRange
  setTimeRange: (newTimeRange: TimeRange) => void

  selectedLabelValue: string | undefined
  setSelectedLabelValue: (newValue: string | undefined) => void

  reset: () => void
}

export const useChartState = create<ChartState>((set) => ({
  selectedChart: undefined,
  setSelectedChart: (newChart) => set({ selectedChart: newChart }),

  timeRange: DEF_TIME_RANGE,
  setTimeRange: (newTimeRange) => set({ timeRange: newTimeRange }),

  selectedLabelValue: undefined,
  setSelectedLabelValue: (newValue) => set({ selectedLabelValue: newValue }),

  reset: () =>
    set({
      selectedChart: undefined,
      timeRange: DEF_TIME_RANGE,
      selectedLabelValue: undefined,
    }),
}))
