import React, { useState, useCallback, useEffect, useContext } from 'react'
import { Root } from '@lib/components'
import { HashRouter as Router } from 'react-router-dom'
import { useSpring, animated } from 'react-spring'

import { useLocalStorageState } from '@lib/utils/useLocalStorageState'

import Sider from './Sider'
import styles from './index.module.less'
import {
  useSiderService,
  SiderService,
  SIDER_WIDTH,
  SIDER_COLLAPSED_WIDTH,
} from './Sider/SiderService'

const collapsedContentOffset = SIDER_COLLAPSED_WIDTH - SIDER_WIDTH
const contentOffsetTrigger = collapsedContentOffset * 0.99

function triggerResizeEvent() {
  const event = document.createEvent('HTMLEvents')
  event.initEvent('resize', true, false)
  window.dispatchEvent(event)
}

const useContentLeftOffset = (collapsed) => {
  const [offset, setOffset] = useState(SIDER_WIDTH)
  const onAnimationStart = useCallback(() => {
    if (!collapsed) {
      setOffset(SIDER_WIDTH)
    }
  }, [collapsed])
  const onAnimationFrame = useCallback(
    ({ x }) => {
      if (collapsed && x < contentOffsetTrigger) {
        setOffset(SIDER_COLLAPSED_WIDTH)
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

export default function AppWithProviders({ registry }) {
  return (
    <SiderService.Provider value={useSiderService()}>
      <App registry={registry} />
    </SiderService.Provider>
  )
}

function App({ registry }) {
  const { collapsed } = useContext(SiderService)
  const {
    contentLeftOffset,
    onAnimationStart,
    onAnimationFrame,
  } = useContentLeftOffset(collapsed)
  const transContentBack = useSpring({
    x: collapsed ? collapsedContentOffset : 0,
    onStart: onAnimationStart,
    onFrame: onAnimationFrame,
  })
  const transContainer = useSpring({
    opacity: 1,
    from: { opacity: 0 },
    delay: 100,
  })

  const { appOptions } = registry

  return (
    <Root>
      <Router>
        <animated.div className={styles.container} style={transContainer}>
          {!appOptions.hideNav && (
            <>
              <Sider registry={registry} animationDelay={0} />
              <animated.div
                className={styles.contentBack}
                style={{
                  left: `${SIDER_WIDTH}px`,
                  transform: transContentBack.x.interpolate(
                    (x) => `translate3d(${x}px, 0, 0)`
                  ),
                }}
              ></animated.div>
            </>
          )}
          <div
            className={styles.content}
            style={
              appOptions.hideNav
                ? {}
                : {
                    marginLeft: contentLeftOffset,
                  }
            }
          >
            <div id="__spa_content__"></div>
          </div>
        </animated.div>
      </Router>
    </Root>
  )
}
