import { useState, createContext } from 'react'
import { useLocalStorageState } from 'ahooks'

export const SIDER_WIDTH = 260
export const SIDER_COLLAPSED_WIDTH = 80

export const SiderContext = createContext<ReturnType<typeof useSider>>(
  null as any
)

export const useSider = () => {
  const [collapsed, setCollapsed] = useLocalStorageState(
    'layout.sider.collapsed',
    false
  )
  const [defaultCollapsed] = useState(collapsed)
  const toggleSider = () => setCollapsed((c) => !c)

  let [hasCollapsedOnceInvoked, setHasCollapsedOnceInvoked] = useState(false)
  const setCollapsedOnce = (collapsed: boolean) => {
    if (hasCollapsedOnceInvoked) {
      return
    }
    setHasCollapsedOnceInvoked(true)
    setCollapsed(collapsed)
  }

  return {
    collapsed,
    defaultCollapsed,

    setCollapsed,
    setCollapsedOnce,
    toggleSider,
  }
}
