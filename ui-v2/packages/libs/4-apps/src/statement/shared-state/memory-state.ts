import { create } from "zustand"

interface SelectedStatementState {
  statementId: string
  setSelectedStatement: (statementId: string) => void
}

export const useSelectedStatementState = create<SelectedStatementState>(
  (set) => ({
    statementId: "",
    setSelectedStatement: (statementId: string) => set({ statementId }),
  }),
)
