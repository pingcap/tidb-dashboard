import React from 'react'
import { Layout, Menu, Icon } from 'antd'
import { Link } from 'react-router-dom'
import { HashRouter as Router } from 'react-router-dom'
import { withTranslation } from 'react-i18next'
import Sider from './Sider'

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
    // const isDev = process.env.NODE_ENV === 'development'

    return (
      <Router>
        <Layout className={styles.container}>
          <Sider
            registry={this.props.registry}
            width={siderWidth}
            onToggle={this.handleToggle}
            collapsed={this.state.collapsed}
            collapsedWidth={80}
          />
          {/* <Layout> */}
          {/* <Nav
              siderWidth={siderWidth}
              siderWidthCollapsed={80}
              collapsed={this.state.collapsed}
              onToggle={this.handleToggle}
            /> */}
          <Layout.Content
            className={styles.content}
            style={{
              marginLeft: `${this.state.collapsed ? 80 : siderWidth}px`,
            }}
          >
            <div id="__spa_content__"></div>
          </Layout.Content>
        </Layout>
        {/* </Layout> */}
      </Router>
    )
  }
}

export default App
