import React, { useState, useEffect } from 'react'
import { Layout, Menu, Icon } from 'antd'
import { Link } from 'react-router-dom'
import { useEventListener } from '@umijs/hooks'
import { useTranslation } from 'react-i18next'
import { useTrail, useSpring, animated } from 'react-spring'
import client from '@pingcap-incubator/dashboard_client'

import Banner from './Banner'
import styles from './index.module.less'

const AnimatedMenuItem = animated(Menu.Item)
const AnimatedSubMenu = animated(Menu.SubMenu)

function TrailMenu({ items, delay, ...props }) {
  const trail = useTrail(items.length, {
    opacity: 1,
    transform: 'translate3d(0, 0, 0)',
    from: { opacity: 0, transform: 'translate3d(0, 60px, 0)' },
    delay,
    config: { mass: 1, tension: 5000, friction: 200 },
  })
  return (
    <Menu {...props}>{trail.map((style, idx) => items[idx]({ style }))}</Menu>
  )
}

function useAnimatedAppMenuItem(registry, appId, title) {
  const { t } = useTranslation()
  return animationProps => {
    const app = registry.apps[appId]
    if (!app) {
      return null
    }
    return (
      <AnimatedMenuItem key={appId} {...animationProps}>
        <Link to={app.indexRoute}>
          {app.icon ? <Icon type={app.icon} /> : null}
          <span>{title ? title : t(`${appId}.nav_title`, appId)}</span>
        </Link>
      </AnimatedMenuItem>
    )
  }
}

function useActiveAppId(registry) {
  const [appId, set] = useState(null)
  useEventListener('single-spa:routing-event', () => {
    const activeApp = registry.getActiveApp()
    if (activeApp) {
      set(activeApp.id)
    }
  })
  return appId
}

function useCurrentLogin() {
  const [login, setLogin] = useState(null)
  useEffect(() => {
    async function fetch() {
      const resp = await client.getInstance().infoWhoamiGet()
      if (resp.data) {
        setLogin(resp.data)
      }
    }
    fetch()
  }, [])
  return login
}

export default function Sider({
  registry,
  width,
  collapsed,
  collapsedWidth,
  onToggle,
  animationDelay,
}) {
  const { t } = useTranslation()
  const activeAppId = useActiveAppId(registry)
  const currentLogin = useCurrentLogin()

  const debugSubMenuItems = [
    useAnimatedAppMenuItem(registry, 'search_logs'),
    useAnimatedAppMenuItem(registry, 'instance_profiling'),
  ]
  const debugSubMenu = animationProps => (
    <AnimatedSubMenu
      key="debug"
      title={
        <span>
          <Icon type="experiment" />
          <span>{t('nav.sider.debug')}</span>
        </span>
      }
      {...animationProps}
    >
      {debugSubMenuItems.map(r => r())}
    </AnimatedSubMenu>
  )

  const menuItems = [
    useAnimatedAppMenuItem(registry, 'overview'),
    useAnimatedAppMenuItem(registry, 'cluster_info'),
    useAnimatedAppMenuItem(registry, 'keyvis'),
    useAnimatedAppMenuItem(registry, 'statement'),
    useAnimatedAppMenuItem(registry, 'diagnose'),
    debugSubMenu,
  ]

  const extraMenuItems = [
    useAnimatedAppMenuItem(registry, 'dashboard_settings'),
    useAnimatedAppMenuItem(
      registry,
      'user_profile',
      currentLogin ? currentLogin.username : '...'
    ),
  ]

  const transSider = useSpring({
    width: collapsed ? collapsedWidth : width,
  })

  return (
    <animated.div style={transSider}>
      <Layout.Sider
        className={styles.sider}
        width={width}
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={width}
        theme="light"
      >
        <Banner
          collapsed={collapsed}
          onToggle={onToggle}
          width={width}
          collapsedWidth={collapsedWidth}
        />
        <TrailMenu
          items={menuItems}
          delay={animationDelay}
          mode="inline"
          selectedKeys={[activeAppId]}
          style={{ flexGrow: 1 }}
          defaultOpenKeys={['debug']}
        />
        <TrailMenu
          items={extraMenuItems}
          delay={animationDelay + 200}
          mode="inline"
          selectedKeys={[activeAppId]}
        />
      </Layout.Sider>
    </animated.div>
  )
}
