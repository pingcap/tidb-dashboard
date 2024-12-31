import { TimeRangeValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { create } from "zustand"

// in slow query detail page, we can open its related statement in statement page
// to open statement page, we need time range information
// so we need to carry time range information from slow query list page to slow query detail page
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
