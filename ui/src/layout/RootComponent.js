import React from 'react';

import { Layout, Menu, Icon } from 'antd';
import { HashRouter as Router, Redirect, Link } from 'react-router-dom';
import styles from './RootComponent.module.less';

class App extends React.PureComponent {
  state = {
    collapsed: false,
    activeAppName: null,
  };

  toggle = () => {
    this.setState({
      collapsed: !this.state.collapsed,
    });
  };

  handleRouting = () => {
    this.setState({
      activeAppName: this.props.registry.getActiveApp().id,
    });
  }

  componentDidMount() {
    window.addEventListener('single-spa:routing-event', this.handleRouting);
  }

  componentWillUnmount() {
    window.removeEventListener('single-spa:routing-event', this.handleRouting);
  }

  render() {
    const siderWidth = 260;

    return (
      <Router><Layout className={styles.container}>
        <Layout.Sider
          className={styles.sider}
          width={siderWidth}
          trigger={null}
          collapsible
          collapsed={this.state.collapsed}
        >
          <Redirect exact from="/" to={this.props.registry.getDefaultRouter()} />
          <Menu
            mode="inline"
            theme="dark"
            selectedKeys={[this.state.activeAppName]}
          >
            {this.props.registry.renderAppMenuItem('home')}
            {this.props.registry.renderAppMenuItem('demo')}
            <Menu.SubMenu
              key="sub1"
              title={
                <span>
                  <Icon type="user" />
                  <span>User</span>
                </span>
              }
            >
              <Menu.Item key="3">Tom</Menu.Item>
              <Menu.Item key="4">Bill</Menu.Item>
              <Menu.Item key="5">Alex</Menu.Item>
            </Menu.SubMenu>
          </Menu>
        </Layout.Sider>
        <Layout>
          <Layout.Header
            className={styles.header}
            style={{ width: `calc(100% - ${this.state.collapsed ? 80 : siderWidth}px)` }}
          >
            <span className={styles.siderTrigger} onClick={this.toggle}>
              <Icon type={this.state.collapsed ? 'menu-unfold' : 'menu-fold'} />
            </span>
          </Layout.Header>
          <Layout.Content
            className={styles.content}
            style={{ paddingLeft: `${this.state.collapsed ? 80 : siderWidth}px` }}
          >
            <div id="__spa_content__"></div>
          </Layout.Content>
        </Layout>
      </Layout></Router>
    );
  }
}

export default App;
