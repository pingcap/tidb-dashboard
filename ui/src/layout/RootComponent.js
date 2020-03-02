import React from 'react'
import { Layout, Menu, Icon } from 'antd'
import { Link } from 'react-router-dom'
import { HashRouter as Router } from 'react-router-dom'
import { withTranslation } from 'react-i18next'
import Nav from './Nav'

import styles from './RootComponent.module.less'

@withTranslation()
class App extends React.PureComponent {
  state = {
    collapsed: false,
    activeAppId: null,
  }

  triggerResizeEvent = () => {
    const event = document.createEvent('HTMLEvents')
    event.initEvent('resize', true, false)
    window.dispatchEvent(event)
  }

  handleToggle = () => {
    this.setState(
      {
        collapsed: !this.state.collapsed,
      },
      () => {
        this.triggerResizeEvent()
      }
    )
  }

  handleRouting = () => {
    const activeApp = this.props.registry.getActiveApp()
    if (activeApp) {
      this.setState({
        activeAppId: activeApp.id,
      })
    }
  }

  async componentDidMount() {
    window.addEventListener('single-spa:routing-event', this.handleRouting)
  }

  componentWillUnmount() {
    window.removeEventListener('single-spa:routing-event', this.handleRouting)
  }

  renderAppMenuItem = appId => {
    const registry = this.props.registry
    const app = registry.apps[appId]
    if (!app) {
      return null
    }
    return (
      <Menu.Item key={appId}>
        <Link to={app.indexRoute}>
          {app.icon ? <Icon type={app.icon} /> : null}
          <span>{this.props.t(`${appId}.nav_title`, appId)}</span>
        </Link>
      </Menu.Item>
    )
  }

  render() {
    const siderWidth = 260
    const isDev = process.env.NODE_ENV === 'development'
    const { t } = this.props

    return (
      <Router>
        <Layout className={styles.container}>
          <Layout.Sider
            className={styles.sider}
            width={siderWidth}
            trigger={null}
            collapsible
            collapsed={this.state.collapsed}
          >
            <Menu
              mode="inline"
              theme="dark"
              selectedKeys={[this.state.activeAppId]}
              defaultOpenKeys={['debug']}
            >
              {this.renderAppMenuItem('cluster_info')}
              {this.renderAppMenuItem('keyvis')}
              {this.renderAppMenuItem('statement')}
              {this.renderAppMenuItem('diagnose')}
              <Menu.SubMenu
                key="debug"
                title={
                  <span>
                    <Icon type="experiment" />
                    <span>{t('nav.sider.debug')}</span>
                  </span>
                }
              >
                {this.renderAppMenuItem('log_searching')}
                {this.renderAppMenuItem('node_profiling')}
              </Menu.SubMenu>
              {isDev ? (
                <Menu.SubMenu
                  key="sub1"
                  title={
                    <span>
                      <Icon type="user" />
                      <span>Demos</span>
                    </span>
                  }
                >
                  {this.renderAppMenuItem('home')}
                  {this.renderAppMenuItem('demo')}
                </Menu.SubMenu>
              ) : null}
            </Menu>
          </Layout.Sider>
          <Layout>
            <Nav
              siderWidth={siderWidth}
              siderWidthCollapsed={80}
              collapsed={this.state.collapsed}
              onToggle={this.handleToggle}
            />
            <Layout.Content
              className={styles.content}
              style={{
                paddingLeft: `${this.state.collapsed ? 80 : siderWidth}px`,
              }}
            >
              <div id="__spa_content__"></div>
            </Layout.Content>
          </Layout>
        </Layout>
      </Router>
    )
  }
}

export default App
