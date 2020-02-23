import React from 'react';
import { Menu, Dropdown } from 'antd';
import _ from 'lodash';
import { withTranslation } from 'react-i18next';

@withTranslation()
class LanguageDropdown extends React.PureComponent {
  handleClick = e => {
    console.log('Change language to', e.key);
    this.props.i18n.changeLanguage(e.key);
  };

  render() {
    const languages = {
      'zh-CN': '简体中文',
      en: 'English',
    };

    const menu = (
      <Menu
        onClick={this.handleClick}
        selectedKeys={[this.props.i18n.language]}
      >
        {_.map(languages, (name, key) => {
          return <Menu.Item key={key}>{name}</Menu.Item>;
        })}
      </Menu>
    );

    return (
      <Dropdown overlay={menu} placement="bottomRight">
        {this.props.children}
      </Dropdown>
    );
  }
}

export default LanguageDropdown;
