import React from 'react'
import { Layout, Menu, Icon } from 'antd'
import { Link } from 'react-router-dom'
import { HashRouter as Router } from 'react-router-dom'
import { withTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import Sider from './Sider'

import styles from './RootComponent.module.less'

const siderWidth = 260
const siderCollapsedWidth = 80

@withTranslation()
class App extends React.PureComponent {
  state = {
    collapsed: false,
    activeAppId: null,
    contentLeftOffset: siderWidth,
  }

  handleToggle = () => {
    this.setState({
      collapsed: !this.state.collapsed,
    })
  }

  triggerResizeEvent = () => {
    const event = document.createEvent('HTMLEvents')
    event.initEvent('resize', true, false)
    window.dispatchEvent(event)
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

  getMotionVariant = () => {
    return this.state.collapsed ? 'collapsed' : 'open'
  }

  handleAnimationStart = () => {
    if (!this.state.collapsed) {
      this.setState({ contentLeftOffset: siderWidth }, () =>
        this.triggerResizeEvent()
      )
    }
  }

  handleAnimationComplete = () => {
    if (this.state.collapsed) {
      this.setState({ contentLeftOffset: siderCollapsedWidth }, () =>
        this.triggerResizeEvent()
      )
    }
  }

  render() {
    return (
      <Router>
        <motion.div
          className={styles.container}
          animate={this.getMotionVariant()}
          initial={this.getMotionVariant()}
          onAnimationStart={this.handleAnimationStart}
          onAnimationComplete={this.handleAnimationComplete}
        >
          <Sider
            registry={this.props.registry}
            width={siderWidth}
            onToggle={this.handleToggle}
            collapsed={this.state.collapsed}
            collapsedWidth={siderCollapsedWidth}
          />
          <motion.div
            className={styles.contentBack}
            variants={{
              open: { left: siderWidth },
              collapsed: { left: siderCollapsedWidth },
            }}
            transition={{ ease: 'easeOut' }}
          ></motion.div>
          <div
            className={styles.content}
            style={{
              marginLeft: this.state.contentLeftOffset,
            }}
          >
            <div id="__spa_content__"></div>
          </div>
        </motion.div>
      </Router>
    )
  }
}

export default App
