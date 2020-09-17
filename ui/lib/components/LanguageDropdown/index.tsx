import { Dropdown, Menu } from 'antd'
import _ from 'lodash'
import React, { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ALL_LANGUAGES, getEffectiveLang } from '@lib/utils/i18n'

function LanguageDropdown({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()

  function handleClick(e) {
    i18n.changeLanguage(e.key)
  }

  const menu = (
    <Menu onClick={handleClick} selectedKeys={[getEffectiveLang()]}>
      {_.map(ALL_LANGUAGES, (name, key) => {
        return <Menu.Item key={key}>{name}</Menu.Item>
      })}
    </Menu>
  )

  return (
    <Dropdown overlay={menu} placement="bottomRight">
      {children}
    </Dropdown>
  )
}

export default LanguageDropdown
