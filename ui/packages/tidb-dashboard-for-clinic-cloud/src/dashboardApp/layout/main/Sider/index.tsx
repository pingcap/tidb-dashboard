import React, { useState, useMemo } from 'react'
import {
  ExperimentOutlined,
  BugOutlined,
  AimOutlined
  // PullRequestOutlined
} from '@ant-design/icons'
import { Layout, Menu } from 'antd'
import { Link } from 'react-router-dom'
import { useEventListener } from 'ahooks'
import { useTranslation } from 'react-i18next'
import { useSpring, animated } from 'react-spring'
import Banner from './Banner'
import styles from './index.module.less'

import { store, useIsFeatureSupport } from '@pingcap/tidb-dashboard-lib'

function useAppMenuItem(
  registry,
  appId,
  enable: boolean = true,
  title?: string,
  hideIcon?: boolean
) {
  const { t } = useTranslation()
  const app = registry.apps[appId]
  if (!enable || !app) {
    return null
  }
  return (
    <Menu.Item key={appId} data-e2e={`menu_item_${appId}`}>
      <Link to={app.indexRoute} id={appId}>
        {!hideIcon && app.icon ? <app.icon /> : null}
        <span>{title ? title : t(`${appId}.nav_title`, appId)}</span>
      </Link>
    </Menu.Item>
  )
}

function useActiveAppId(registry) {
  const [appId, set] = useState('')
  useEventListener(
    'single-spa:routing-event',
    () => {
      const activeApp = registry.getActiveApp()
      if (activeApp) {
        set(activeApp.id)
      }
    },
    {
      target: window
    }
  )
  return appId
}

function Sider({
  registry,
  fullWidth,
  defaultCollapsed,
  collapsed,
  collapsedWidth,
  onToggle,
  animationDelay
}) {
  const { t } = useTranslation()
  const activeAppId = useActiveAppId(registry)

  const whoAmI = store.useState((s) => s.whoAmI)
  const appInfo = store.useState((s) => s.appInfo)

  const supportConProf = useIsFeatureSupport('conprof')
  const profilingSubMenuItems = [
    useAppMenuItem(registry, 'instance_profiling', true, '', true),
    useAppMenuItem(registry, 'conprof', supportConProf, '', true)
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
    useAppMenuItem(registry, 'debug_api')
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

  // const conflictSubMenuItems = [useAppMenuItem(registry, 'deadlock')]

  // const conflictSubMenu = (
  //   <Menu.SubMenu
  //     key="conflict"
  //     title={
  //       <span>
  //         <PullRequestOutlined />
  //         <span>{t('nav.sider.conflict')}</span>
  //       </span>
  //     }
  //   >
  //     {conflictSubMenuItems}
  //   </Menu.SubMenu>
  // )

  const experimentalSubMenuItems = [
    useAppMenuItem(registry, 'query_editor'),
    useAppMenuItem(registry, 'configuration')
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

  const supportTopSQL = useIsFeatureSupport('topsql')
  const supportResourceManager = useIsFeatureSupport('resource_manager')
  const menuItems = [
    useAppMenuItem(registry, 'overview'),
    useAppMenuItem(registry, 'cluster_info'),
    // topSQL
    useAppMenuItem(registry, 'topsql', supportTopSQL),
    useAppMenuItem(registry, 'statement'),
    useAppMenuItem(registry, 'slow_query'),
    useAppMenuItem(registry, 'keyviz'),
    useAppMenuItem(registry, 'system_report'),
    // warning: "diagnose" app doesn't release yet
    // useAppMenuItem(registry, 'diagnose'),
    useAppMenuItem(registry, 'monitoring'),
    useAppMenuItem(registry, 'search_logs'),
    useAppMenuItem(registry, 'resource_manager', supportResourceManager),
    // useAppMenuItem(registry, '__APP_NAME__'),
    // NOTE: Don't remove above comment line, it is a placeholder for code generator
    debugSubMenu
    // conflictSubMenu
  ]

  if (appInfo?.enable_experimental) {
    menuItems.push(experimentalSubMenu)
  }

  let displayName = whoAmI?.display_name || '...'

  const extraMenuItems = [
    useAppMenuItem(registry, 'dashboard_settings'),
    useAppMenuItem(registry, 'user_profile', true, displayName)
  ]

  const transSider = useSpring({
    width: collapsed ? collapsedWidth : fullWidth
  })

  const defaultOpenKeys = useMemo(() => {
    if (defaultCollapsed) {
      return []
    } else {
      return ['debug', 'experimental', 'profiling']
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
