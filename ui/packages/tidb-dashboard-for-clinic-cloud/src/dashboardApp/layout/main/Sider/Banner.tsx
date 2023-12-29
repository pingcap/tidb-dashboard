import React, { useMemo, useRef } from 'react'
import { CaretRightOutlined, CaretLeftOutlined } from '@ant-design/icons'
import { useSize } from 'ahooks'
import Flexbox from '@g07cha/flexbox-react'
import { useSpring, animated } from 'react-spring'
import { useTranslation, TFunction } from 'react-i18next'

import { InfoInfoResponse } from '~/client'

import {
  // store
  store
} from '@pingcap/tidb-dashboard-lib'

import { lightLogoSvg } from '~/utils/distro/assetsRes'

import styles from './Banner.module.less'

const toggleWidth = 40
const toggleHeight = 50

function parseVersion(i: InfoInfoResponse, t: TFunction) {
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
      if (i.version.internal_version.startsWith('v')) {
        return i.version.internal_version
      } else {
        return `v${i.version.internal_version}`
      }
    }
    return null
  }

  if (i.version.pd_version) {
    // e.g. PD v4.0.1
    return `${t('distro.pd')} ${i.version.pd_version}`
  }
}

export default function ToggleBanner({
  fullWidth,
  collapsedWidth,
  collapsed,
  onToggle
}) {
  const { t } = useTranslation()
  const bannerRef = useRef(null)
  const bannerSize = useSize(bannerRef)
  const transBanner = useSpring({
    opacity: collapsed ? 0 : 1,
    height: collapsed ? toggleHeight : bannerSize?.height ?? 0
  })
  const transButton = useSpring({
    left: collapsed ? 0 : fullWidth - toggleWidth,
    width: collapsed ? collapsedWidth : toggleWidth
  })

  const appInfo = store.useState((s) => s.appInfo)

  const version = useMemo(() => {
    if (appInfo) {
      return parseVersion(appInfo, t)
    }
    return null
  }, [appInfo, t])

  return (
    <div className={styles.banner} onClick={onToggle}>
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
              <img src={lightLogoSvg} style={{ height: 30 }} />
            </div>
            <div className={styles.bannerContent}>
              <div className={styles.bannerTitle}>
                {t('distro.tidb')} Dashboard
              </div>
              <div className={styles.bannerVersion}>
                {version || 'Version unknown'}
              </div>
            </div>
          </Flexbox>
        </div>
      </animated.div>
      <animated.div style={transButton} className={styles.bannerRight}>
        {collapsed ? (
          <CaretRightOutlined style={{ margin: 'auto' }} />
        ) : (
          <CaretLeftOutlined style={{ margin: 'auto' }} />
        )}
      </animated.div>
    </div>
  )
}
