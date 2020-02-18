import React from 'react';
import { Menu, Icon, Dropdown } from 'antd';
import _ from 'lodash';
import { withTranslation } from 'react-i18next';
import NavAction from './NavAction';

class LangDropdown extends React.PureComponent {
  handleClick = e => {
    console.log('Changing language to', e.key);
    this.props.i18n.changeLanguage(e.key);
  };

  render() {
    const languages = {
      zh_CN: '简体中文',
      en: 'English',
    };

    const menu = (
      <Menu onClick={this.handleClick}>
        {_.map(languages, (name, key) => {
          return <Menu.Item key={key}>{name}</Menu.Item>;
        })}
      </Menu>
    );

    return (
      <Dropdown overlay={menu} placement="bottomRight">
        <NavAction>
          <Icon type="global" />
        </NavAction>
      </Dropdown>
    );
  }
}

export default withTranslation()(LangDropdown);
