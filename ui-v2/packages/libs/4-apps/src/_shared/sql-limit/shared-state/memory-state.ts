import { create } from "zustand"

interface SettingModalState {
  visible: boolean
  setVisible: (visible: boolean) => void
}

export const useSettingModalState = create<SettingModalState>((set) => ({
  visible: false,
  setVisible: (visible: boolean) => set({ visible }),
}))
