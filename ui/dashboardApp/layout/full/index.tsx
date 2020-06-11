import React from 'react'
import { Root } from '@lib/components'
import { HashRouter as Router } from 'react-router-dom'
import { animated } from 'react-spring'

import styles from './index.module.less'

export default function App({ registry }) {
  return (
    <Root>
      <Router>
        <animated.div className={styles.container}>
          <div className={styles.content}>
            <div id="__spa_content__"></div>
          </div>
        </animated.div>
      </Router>
    </Root>
  )
}
