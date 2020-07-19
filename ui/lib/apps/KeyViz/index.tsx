import React from 'react'
import { Root } from '@lib/components'
import KeyViz from './components/KeyViz'

import { ConfigProvider } from 'antd'
import i18next from 'i18next'
import enUS from 'antd/es/locale/en_US'
import zhCN from 'antd/es/locale/zh_CN'

export default () => {
  return (
    <Root>
      <ConfigProvider locale={i18next.language === 'en' ? enUS : zhCN}>
        <KeyViz />
      </ConfigProvider>
    </Root>
  )
}
