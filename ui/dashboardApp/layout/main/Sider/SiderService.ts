import { useState } from 'react'
import { useLocalStorageState } from 'ahooks'

import { useToken } from '@lib/utils/di'

export const SIDER_WIDTH = 260
export const SIDER_COLLAPSED_WIDTH = 80

export const useSiderService = () => {
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

export const SiderService = useToken(useSiderService)
