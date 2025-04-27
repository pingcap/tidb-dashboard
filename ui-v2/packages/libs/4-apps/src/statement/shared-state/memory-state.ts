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

//------------------------------------------------------------------

interface SettingDrawerState {
  visible: boolean
  setVisible: (visible: boolean) => void
}

export const useSettingDrawerState = create<SettingDrawerState>((set) => ({
  visible: false,
  setVisible: (visible: boolean) => set({ visible }),
}))
