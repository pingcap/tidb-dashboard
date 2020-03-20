import React from 'react'
import { Layout, Menu, Icon } from 'antd'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Flexbox from '@g07cha/flexbox-react'
import { withTranslation } from 'react-i18next'
import client from '@pingcap-incubator/dashboard_client'

import { ReactComponent as Logo } from './logo-icon-light.svg'
import styles from './Sider.module.less'

const ToggleBanner = props => {
  const toggleWidth = 40

  const expandedContentVariants = {
    open: { opacity: 1, height: 'auto' },
    collapsed: { opacity: 0, height: 50 },
  }

  const toggleButtonVariants = {
    open: { left: props.width - toggleWidth, width: toggleWidth },
    collapsed: { left: 0, width: props.collapsedWidth },
  }

  return (
    <motion.div className={styles.banner} onClick={props.onToggle}>
      <motion.div
        variants={expandedContentVariants}
        style={{ width: props.width - toggleWidth }}
        className={styles.bannerLeft}
        transition={{ ease: 'easeOut' }}
      >
        <Flexbox flexDirection="row">
          <div className={styles.bannerLogo}>
            <Logo height={30} />
          </div>
          <div className={styles.bannerContent}>
            <div className={styles.bannerTitle}>TiDB Dashboard</div>
            <div className={styles.bannerVersion}>Dashboard version 4.0.0</div>
          </div>
        </Flexbox>
      </motion.div>
      <motion.div
        variants={toggleButtonVariants}
        className={styles.bannerRight}
        transition={{ ease: 'easeOut' }}
      >
        <Icon
          type={props.collapsed ? 'menu-unfold' : 'menu-fold'}
          style={{ margin: 'auto' }}
        />
      </motion.div>
    </motion.div>
  )
}

@withTranslation()
class Sider extends React.PureComponent {
  state = {
    activeAppId: null,
    currentLogin: null,
  }

  handleRouting = () => {
    const activeApp = this.props.registry.getActiveApp()
    if (activeApp) {
      this.setState({
        activeAppId: activeApp.id,
      })
    }
  }

  updateCurrentLogin = async () => {
    const resp = await client.getInstance().infoWhoamiGet()
    if (resp.data) {
      this.setState({ currentLogin: resp.data })
    }
  }

  async componentDidMount() {
    window.addEventListener('single-spa:routing-event', this.handleRouting)
    this.updateCurrentLogin()
  }

  componentWillUnmount() {
    window.removeEventListener('single-spa:routing-event', this.handleRouting)
  }

  renderAppMenuItem = (appId, titleOverride) => {
    const registry = this.props.registry
    const app = registry.apps[appId]
    if (!app) {
      return null
    }
    return (
      <Menu.Item key={appId}>
        <Link to={app.indexRoute}>
          {app.icon ? <Icon type={app.icon} /> : null}
          <span>
            {titleOverride
              ? titleOverride
              : this.props.t(`${appId}.nav_title`, appId)}
          </span>
        </Link>
      </Menu.Item>
    )
  }

  render() {
    const { t } = this.props

    return (
      <Layout.Sider
        className={styles.sider}
        width={this.props.width}
        trigger={null}
        collapsible
        collapsed={this.props.collapsed}
        collapsedWidth={this.props.collapsedWidth}
      >
        <ToggleBanner
          collapsed={this.props.collapsed}
          onToggle={this.props.onToggle}
          width={this.props.width}
          collapsedWidth={this.props.collapsedWidth}
        />
        <Menu
          mode="inline"
          selectedKeys={[this.state.activeAppId]}
          style={{ flexGrow: 1 }}
          defaultOpenKeys={['debug']}
        >
          {this.renderAppMenuItem('overview')}
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
            {this.renderAppMenuItem('search_logs')}
            {this.renderAppMenuItem('instance_profiling')}
          </Menu.SubMenu>
        </Menu>
        <Menu mode="inline" selectedKeys={[this.state.activeAppId]}>
          {this.renderAppMenuItem('dashboard_settings')}
          {this.renderAppMenuItem(
            'user_profile',
            this.state.currentLogin ? this.state.currentLogin.username : '...'
          )}
        </Menu>
      </Layout.Sider>
    )
  }
}

export default Sider
