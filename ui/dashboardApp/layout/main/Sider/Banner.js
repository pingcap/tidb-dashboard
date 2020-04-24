import React from 'react'
import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons'
import { useSize } from '@umijs/hooks'
import Flexbox from '@g07cha/flexbox-react'
import { useSpring, animated } from 'react-spring'

import { ReactComponent as Logo } from './logo-icon-light.svg'
import styles from './Banner.module.less'

const toggleWidth = 40
const toggleHeight = 50

export default function ToggleBanner({
  width,
  collapsedWidth,
  collapsed,
  onToggle,
}) {
  const [bannerSize, bannerRef] = useSize()
  const transBanner = useSpring({
    opacity: collapsed ? 0 : 1,
    height: collapsed ? toggleHeight : bannerSize.height || 0,
  })
  const transButton = useSpring({
    left: collapsed ? 0 : width - toggleWidth,
    width: collapsed ? collapsedWidth : toggleWidth,
  })

  return (
    <div className={styles.banner} onClick={onToggle}>
      <animated.div
        style={transBanner}
        className={styles.bannerLeftAnimationWrapper}
      >
        <div
          ref={bannerRef}
          className={styles.bannerLeft}
          style={{ width: width - toggleWidth }}
        >
          <Flexbox flexDirection="row">
            <div className={styles.bannerLogo}>
              <Logo height={30} />
            </div>
            <div className={styles.bannerContent}>
              <div className={styles.bannerTitle}>TiDB Dashboard</div>
              <div className={styles.bannerVersion}>
                Dashboard version 4.0.0
              </div>
            </div>
          </Flexbox>
        </div>
      </animated.div>
      <animated.div style={transButton} className={styles.bannerRight}>
        {collapsed ? (
          <MenuUnfoldOutlined style={{ margin: 'auto' }} />
        ) : (
          <MenuFoldOutlined style={{ margin: 'auto' }} />
        )}
      </animated.div>
    </div>
  )
}
