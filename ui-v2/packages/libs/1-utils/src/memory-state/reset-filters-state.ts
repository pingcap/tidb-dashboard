import { create } from "zustand"

interface ResetFiltersState {
  resetVal: number
  reset: () => void
}

export const useResetFiltersState = create<ResetFiltersState>((set) => ({
  resetVal: 0,
  reset: () => set({ resetVal: Date.now() }),
}))
