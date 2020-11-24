import React, { useCallback, useMemo, useState } from 'react'
import { BugOutlined, ExperimentOutlined } from '@ant-design/icons'
import { Layout, Menu } from 'antd'
import { Link } from 'react-router-dom'
import { useEventListener } from '@umijs/hooks'
import { useTranslation } from 'react-i18next'
import client from '@lib/client'

import Banner from './Banner'
import styles from './index.module.less'
import { useClientRequest } from '@lib/utils/useClientRequest'

function useAppMenuItem(registry, appId, title?: string) {
  const { t } = useTranslation()
  const app = registry.apps[appId]
  if (!app) {
    return null
  }
  return (
    <Menu.Item key={appId} icon={app.icon ? <app.icon /> : null}>
      <Link to={app.indexRoute} id={appId}>
        {title ? title : t(`${appId}.nav_title`, appId)}
      </Link>
    </Menu.Item>
  )
}

function useActiveAppId(registry) {
  const [appId, set] = useState('')
  useEventListener('single-spa:routing-event', () => {
    const activeApp = registry.getActiveApp()
    if (activeApp) {
      set(activeApp.id)
    }
  })
  return appId
}

function triggerResizeEvent() {
  const event = document.createEvent('HTMLEvents')
  event.initEvent('resize', true, false)
  window.dispatchEvent(event)
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

  const { data: currentLogin } = useClientRequest((reqConfig) =>
    client.getInstance().infoWhoami(reqConfig)
  )
  const { data: info } = useClientRequest((reqConfig) =>
    client.getInstance().infoGet(reqConfig)
  )

  const debugSubMenuItems = [useAppMenuItem(registry, 'instance_profiling')]
  const debugSubMenu = (
    <Menu.SubMenu
      key="debug"
      icon={<BugOutlined />}
      title={t('nav.sider.debug')}
    >
      {debugSubMenuItems}
    </Menu.SubMenu>
  )

  const experimentalSubMenuItems = [
    useAppMenuItem(registry, 'query_editor'),
    useAppMenuItem(registry, 'configuration'),
  ]
  const experimentalSubMenu = (
    <Menu.SubMenu
      key="experimental"
      icon={<ExperimentOutlined />}
      title={t('nav.sider.experimental')}
    >
      {experimentalSubMenuItems}
    </Menu.SubMenu>
  )

  const menuItems = [
    useAppMenuItem(registry, 'overview'),
    useAppMenuItem(registry, 'cluster_info'),
    useAppMenuItem(registry, 'statement'),
    useAppMenuItem(registry, 'slow_query'),
    useAppMenuItem(registry, 'keyviz'),
    useAppMenuItem(registry, 'system_report'),
    useAppMenuItem(registry, 'diagnose'),
    useAppMenuItem(registry, 'search_logs'),
    debugSubMenu,
  ]

  if (info?.enable_experimental) {
    menuItems.push(experimentalSubMenu)
  }

  let displayName = currentLogin?.username ?? '...'
  if (currentLogin?.is_shared) {
    displayName += ' (Shared)'
  }

  const extraMenuItems = [
    useAppMenuItem(registry, 'dashboard_settings'),
    useAppMenuItem(registry, 'user_profile', displayName),
  ]

  const siderStyle = {
    width: collapsed ? collapsedWidth : fullWidth,
  }

  const defaultOpenKeys = useMemo(() => {
    if (defaultCollapsed) {
      return []
    } else {
      return ['debug', 'experimental']
    }
  }, [defaultCollapsed])

  const wrapperRef = useCallback((wrapper) => {
    if (wrapper !== null) {
      wrapper.addEventListener('transitionend', (e) => {
        if (e.target !== wrapper || e.propertyName !== 'width') return
        triggerResizeEvent()
      })
    }
  }, [])

  return (
    <div className={styles.wrapper} style={siderStyle} ref={wrapperRef}>
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
          subMenuOpenDelay={animationDelay}
          subMenuCloseDelay={animationDelay + 0.1}
          mode="inline"
          selectedKeys={[activeAppId]}
          style={{ flexGrow: 1 }}
          defaultOpenKeys={defaultOpenKeys}
        >
          {menuItems}
        </Menu>
        <Menu
          subMenuOpenDelay={animationDelay}
          subMenuCloseDelay={animationDelay}
          mode="inline"
          selectedKeys={[activeAppId]}
        >
          {extraMenuItems}
        </Menu>
      </Layout.Sider>
    </div>
  )
}

export default Sider
