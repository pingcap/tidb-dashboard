import React, { useCallback, useState } from 'react'
import { Root } from '@lib/components'
import { useLocalStorageState } from '@umijs/hooks'
import { HashRouter as Router } from 'react-router-dom'
import { animated, useSpring } from 'react-spring'

import Sider from './Sider'
import styles from './index.module.less'

const siderWidth = 260
const siderCollapsedWidth = 80

export default function App({ registry }) {
  const [collapsed, setCollapsed] = useLocalStorageState(
    'layout.sider.collapsed',
    false
  )
  const [defaultCollapsed] = useState(collapsed)
  const transContainer = useSpring({
    opacity: 1,
    from: { opacity: 0 },
    delay: 100,
  })

  const handleToggle = useCallback(() => {
    setCollapsed((c) => !c)
  }, [setCollapsed])

  const { appOptions } = registry

  return (
    <Root>
      <Router>
        <animated.div className={styles.container} style={transContainer}>
          {!appOptions.hideNav && (
            <>
              <Sider
                registry={registry}
                fullWidth={siderWidth}
                onToggle={handleToggle}
                defaultCollapsed={defaultCollapsed}
                collapsed={collapsed}
                collapsedWidth={siderCollapsedWidth}
                animationDelay={0}
              />
            </>
          )}
          <div className={styles.content}>
            <div id="__spa_content__"></div>
          </div>
        </animated.div>
      </Router>
    </Root>
  )
}
