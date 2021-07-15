import React, { useContext, useMemo, useRef } from 'react'
import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons'
import { useSize } from 'ahooks'
import Flexbox from '@g07cha/flexbox-react'
import { useSpring, animated } from 'react-spring'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client, { InfoInfoResponse } from '@lib/client'

import { ReactComponent as Logo } from './logo-icon-light.svg'
import styles from './Banner.module.less'
import { SiderService } from './SiderService'

const toggleWidth = 40
const toggleHeight = 50

function parseVersion(i: InfoInfoResponse) {
  if (!i.version) {
    return null
  }
  if (i.version.standalone !== 'No') {
    // For Standalone == Yes / Unknown, display internal version
    if (i.version.internal_version === 'nightly') {
      let vPrefix = i.version.internal_version
      if (i.version.build_git_hash) {
        vPrefix += `-${i.version.build_git_hash.substr(0, 8)}`
      }
      // e.g. nightly-xxxxxxxx
      return vPrefix
    }
    if (i.version.internal_version) {
      // e.g. v2020.07.01.1
      return `v${i.version.internal_version}`
    }
    return null
  }

  if (i.version.pd_version) {
    // e.g. PD v4.0.1
    return `PD ${i.version.pd_version}`
  }
}

export default function ToggleBanner({ fullWidth, collapsedWidth }) {
  const bannerRef = useRef(null)
  const bannerSize = useSize(bannerRef)
  const { collapsed, toggleSider } = useContext(SiderService)
  const transBanner = useSpring({
    opacity: collapsed ? 0 : 1,
    height: collapsed ? toggleHeight : bannerSize.height || 0,
  })
  const transButton = useSpring({
    left: collapsed ? 0 : fullWidth - toggleWidth,
    width: collapsed ? collapsedWidth : toggleWidth,
  })

  const { data, isLoading } = useClientRequest((reqConfig) =>
    client.getInstance().infoGet(reqConfig)
  )

  const version = useMemo(() => {
    if (data) {
      return parseVersion(data)
    }
    return null
  }, [data])

  return (
    <div className={styles.banner} onClick={toggleSider}>
      <animated.div
        style={transBanner}
        className={styles.bannerLeftAnimationWrapper}
      >
        <div
          ref={bannerRef}
          className={styles.bannerLeft}
          style={{ width: fullWidth - toggleWidth }}
        >
          <Flexbox flexDirection="row">
            <div className={styles.bannerLogo}>
              <Logo height={30} />
            </div>
            <div className={styles.bannerContent}>
              <div className={styles.bannerTitle}>TiDB Dashboard</div>
              <div className={styles.bannerVersion}>
                {isLoading && '...'}
                {!isLoading && (version || 'Version unknown')}
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
