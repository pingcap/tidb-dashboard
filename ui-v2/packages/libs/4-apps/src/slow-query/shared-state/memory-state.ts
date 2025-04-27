import { TimeRangeValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { create } from "zustand"

// in slow query list page, when user select a time range that beyond max 24 hours
// we need to clip the time range and show a alert
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

//-------------------------------------------------------------

interface SelectedSlowQueryState {
  slowQueryId: string
  setSelectedSlowQuery: (slowQueryId: string) => void
}

export const useSelectedSlowQueryState = create<SelectedSlowQueryState>(
  (set) => ({
    slowQueryId: "",
    setSelectedSlowQuery: (slowQueryId: string) => set({ slowQueryId }),
  }),
)
