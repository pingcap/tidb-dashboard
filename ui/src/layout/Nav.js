import React from 'react';
import { Layout, Menu, Dropdown, Icon } from 'antd';
import Flexbox from '@g07cha/flexbox-react';
import LanguageDropdown from '@/components/LanguageDropdown';
import NavAction from './NavAction';
import { withTranslation } from 'react-i18next';
import client from '@/utils/client';
import * as authUtil from '@/utils/auth';

import styles from './Nav.module.less';

@withTranslation()
class Nav extends React.PureComponent {
  state = {
    login: null,
  };

  handleToggle = () => {
    this.props.onToggle && this.props.onToggle();
  };

  handleUserMenuClick = item => {
    switch (item.key) {
      case 'signout':
        authUtil.clearAuthToken();
        window.location.reload();
        break;
      default:
    }
  };

  async componentDidMount() {
    const resp = await client.dashboard.infoWhoamiGet();
    if (resp.data) {
      this.setState({ login: resp.data });
    }
  }

  render() {
    const userMenu = (
      <Menu onClick={this.handleUserMenuClick}>
        <Menu.Item key="signout">
          <Icon type="logout" /> {this.props.t('nav.user.signout')}
        </Menu.Item>
      </Menu>
    );

    return (
      <Layout.Header
        className={styles.nav}
        style={{
          width: `calc(100% - ${
            this.props.collapsed
              ? this.props.siderWidthCollapsed
              : this.props.siderWidth
          }px)`,
        }}
      >
        <Flexbox justifyContent="space-between" alignItems="center">
          <span className={styles.siderTrigger} onClick={this.handleToggle}>
            <Icon type={this.props.collapsed ? 'menu-unfold' : 'menu-fold'} />
          </span>
          <div>
            <LanguageDropdown>
              <NavAction>
                <Icon type="global" />
              </NavAction>
            </LanguageDropdown>
            <Dropdown overlay={userMenu} placement="bottomRight">
              <NavAction>
                {this.state.login ? this.state.login.username : '...'}
                <Icon type="down" style={{ marginLeft: '5px' }} />
              </NavAction>
            </Dropdown>
          </div>
        </Flexbox>
      </Layout.Header>
    );
  }
}

export default Nav;
