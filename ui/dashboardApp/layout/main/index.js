import React, { useState, useCallback, useEffect } from 'react'
import { Root } from '@lib/components'
import { useToggle } from '@umijs/hooks'
import { HashRouter as Router } from 'react-router-dom'
import { useSpring, animated } from 'react-spring'

import Sider from './Sider'
import styles from './index.module.less'

const siderWidth = 260
const siderCollapsedWidth = 80
const collapsedContentOffset = siderCollapsedWidth - siderWidth
const contentOffsetTrigger = collapsedContentOffset * 0.99

function triggerResizeEvent() {
  const event = document.createEvent('HTMLEvents')
  event.initEvent('resize', true, false)
  window.dispatchEvent(event)
}

const useContentLeftOffset = (collapsed) => {
  const [offset, setOffset] = useState(siderWidth)
  const onAnimationStart = useCallback(() => {
    if (!collapsed) {
      setOffset(siderWidth)
    }
  }, [collapsed])
  const onAnimationFrame = useCallback(
    ({ x }) => {
      if (collapsed && x < contentOffsetTrigger) {
        setOffset(siderCollapsedWidth)
      }
    },
    [collapsed]
  )
  useEffect(triggerResizeEvent, [offset])
  return {
    contentLeftOffset: offset,
    onAnimationStart,
    onAnimationFrame,
  }
}

export default function App({ registry }) {
  const { state: collapsed, toggle: toggleCollapsed } = useToggle()
  const {
    contentLeftOffset,
    onAnimationStart,
    onAnimationFrame,
  } = useContentLeftOffset(collapsed)
  const transContentBack = useSpring({
    x: collapsed ? collapsedContentOffset : 0,
    from: { x: 0 },
    onStart: onAnimationStart,
    onFrame: onAnimationFrame,
  })
  const transContainer = useSpring({
    opacity: 1,
    from: { opacity: 0 },
    delay: 100,
  })

  return (
    <Root>
      <Router>
        <animated.div className={styles.container} style={transContainer}>
          <Sider
            registry={registry}
            width={siderWidth}
            onToggle={() => toggleCollapsed()}
            collapsed={collapsed}
            collapsedWidth={siderCollapsedWidth}
            animationDelay={0}
          />
          <animated.div
            className={styles.contentBack}
            style={{
              left: `${siderWidth}px`,
              transform: transContentBack.x.interpolate(
                (x) => `translate3d(${x}px, 0, 0)`
              ),
            }}
          ></animated.div>
          <div
            className={styles.content}
            style={{
              marginLeft: contentLeftOffset,
            }}
          >
            <div id="__spa_content__"></div>
          </div>
        </animated.div>
      </Router>
    </Root>
  )
}
