import React, { useState, useEffect } from 'react'
import { ExperimentOutlined } from '@ant-design/icons'
import { Layout, Menu } from 'antd'
import { Link } from 'react-router-dom'
import { useEventListener } from '@umijs/hooks'
import { useTranslation } from 'react-i18next'
import { useSpring, animated } from 'react-spring'
import client from '@lib/client'

import Banner from './Banner'
import styles from './index.module.less'

function useAppMenuItem(registry, appId, title) {
  const { t } = useTranslation()
  const app = registry.apps[appId]
  if (!app) {
    return null
  }
  return (
    <Menu.Item key={appId}>
      <Link to={app.indexRoute} id={appId}>
        {app.icon ? <app.icon /> : null}
        <span>{title ? title : t(`${appId}.nav_title`, appId)}</span>
      </Link>
    </Menu.Item>
  )
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

function Sider({
  registry,
  fullWidth,
  defaultCollapsed,
  collapsed,
  collapsedWidth,
  onToggle,
  animationDelay,
}) {
  const { t } = useTranslation()
  const activeAppId = useActiveAppId(registry)
  const currentLogin = useCurrentLogin()

  const debugSubMenuItems = [useAppMenuItem(registry, 'instance_profiling')]
  const debugSubMenu = (
    <Menu.SubMenu
      key="debug"
      title={
        <span>
          <ExperimentOutlined />
          <span>{t('nav.sider.debug')}</span>
        </span>
      }
    >
      {debugSubMenuItems}
    </Menu.SubMenu>
  )

  const menuItems = [
    useAppMenuItem(registry, 'debug_playground'),
    useAppMenuItem(registry, 'overview'),
    useAppMenuItem(registry, 'cluster_info'),
    useAppMenuItem(registry, 'keyviz'),
    useAppMenuItem(registry, 'statement'),
    useAppMenuItem(registry, 'slow_query'),
    useAppMenuItem(registry, 'diagnose'),
    useAppMenuItem(registry, 'search_logs'),
    debugSubMenu,
  ]

  const extraMenuItems = [
    useAppMenuItem(registry, 'dashboard_settings'),
    useAppMenuItem(
      registry,
      'user_profile',
      currentLogin ? currentLogin.username : '...'
    ),
  ]

  const transSider = useSpring({
    width: collapsed ? collapsedWidth : fullWidth,
  })

  return (
    <animated.div style={transSider}>
      <Layout.Sider
        className={styles.sider}
        width={fullWidth}
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={fullWidth}
        defaultCollapsed={defaultCollapsed}
        theme="light"
      >
        <Banner
          collapsed={collapsed}
          onToggle={onToggle}
          fullWidth={fullWidth}
          collapsedWidth={collapsedWidth}
        />
        <Menu
          delay={animationDelay}
          mode="inline"
          selectedKeys={[activeAppId]}
          style={{ flexGrow: 1 }}
        >
          {menuItems}
        </Menu>
        <Menu
          delay={animationDelay + 200}
          mode="inline"
          selectedKeys={[activeAppId]}
        >
          {extraMenuItems}
        </Menu>
      </Layout.Sider>
    </animated.div>
  )
}

export default Sider
