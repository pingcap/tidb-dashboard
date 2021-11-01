import React, { useState, useMemo } from 'react'
import { ExperimentOutlined, BugOutlined, AimOutlined } from '@ant-design/icons'
import { Layout, Menu } from 'antd'
import { Link } from 'react-router-dom'
import { useEventListener } from 'ahooks'
import { useTranslation } from 'react-i18next'
import { useSpring, animated } from 'react-spring'
import Banner from './Banner'
import styles from './index.module.less'
import { store } from '@lib/utils/store'

function useAppMenuItem(registry, appId, title?: string, hideIcon?: boolean) {
  const { t } = useTranslation()
  const app = registry.apps[appId]
  if (!app) {
    return null
  }
  return (
    <Menu.Item key={appId}>
      <Link to={app.indexRoute} id={appId}>
        {!hideIcon && app.icon ? <app.icon /> : null}
        <span>{title ? title : t(`${appId}.nav_title`, appId)}</span>
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

  const whoAmI = store.useState((s) => s.whoAmI)
  const appInfo = store.useState((s) => s.appInfo)

  const profilingSubMenuItems = [
    useAppMenuItem(registry, 'instance_profiling', '', true),
    useAppMenuItem(registry, 'continuous_profiling', '', true),
  ]

  const profilingSubMenu = (
    <Menu.SubMenu
      key="profiling"
      title={
        <span>
          <AimOutlined />
          <span>{t('profiling.nav_title')}</span>
        </span>
      }
    >
      {profilingSubMenuItems}
    </Menu.SubMenu>
  )

  const debugSubMenuItems = [
    profilingSubMenu,
    useAppMenuItem(registry, 'debug_api'),
  ]

  const debugSubMenu = (
    <Menu.SubMenu
      key="debug"
      title={
        <span>
          <BugOutlined />
          <span>{t('nav.sider.debug')}</span>
        </span>
      }
    >
      {debugSubMenuItems}
    </Menu.SubMenu>
  )

  const experimentalSubMenuItems = [
    useAppMenuItem(registry, 'top_sql'),
    useAppMenuItem(registry, 'query_editor'),
    useAppMenuItem(registry, 'configuration'),
  ]
  const experimentalSubMenu = (
    <Menu.SubMenu
      key="experimental"
      title={
        <span>
          <ExperimentOutlined />
          <span>{t('nav.sider.experimental')}</span>
        </span>
      }
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
    // useAppMenuItem(registry, '__APP_NAME__'),
    // NOTE: Don't remove above comment line, it is a placeholder for code generator
    debugSubMenu,
  ]

  if (appInfo?.enable_experimental) {
    menuItems.push(experimentalSubMenu)
  }

  let displayName = whoAmI?.display_name || '...'

  const extraMenuItems = [
    useAppMenuItem(registry, 'dashboard_settings'),
    useAppMenuItem(registry, 'user_profile', displayName),
  ]

  const transSider = useSpring({
    width: collapsed ? collapsedWidth : fullWidth,
  })

  const defaultOpenKeys = useMemo(() => {
    if (defaultCollapsed) {
      return []
    } else {
      return ['debug', 'experimental']
    }
  }, [defaultCollapsed])

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
    </animated.div>
  )
}

export default Sider
