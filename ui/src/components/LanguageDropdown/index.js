import React from 'react'
import { Menu, Dropdown } from 'antd'
import _ from 'lodash'
import { withTranslation } from 'react-i18next'
import { ALL_LANGUAGES } from '@/utils/i18n'

@withTranslation()
class LanguageDropdown extends React.PureComponent {
  handleClick = e => {
    console.log('Change language to', e.key)
    this.props.i18n.changeLanguage(e.key)
  }

  render() {
    const menu = (
      <Menu
        onClick={this.handleClick}
        selectedKeys={[this.props.i18n.language]}
      >
        {_.map(ALL_LANGUAGES, (name, key) => {
          return <Menu.Item key={key}>{name}</Menu.Item>
        })}
      </Menu>
    )

    return (
      <Dropdown overlay={menu} placement="bottomRight">
        {this.props.children}
      </Dropdown>
    )
  }
}

export default LanguageDropdown
