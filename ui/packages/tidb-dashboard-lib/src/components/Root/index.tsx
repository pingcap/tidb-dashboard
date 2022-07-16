import React from 'react'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DownOutlined,
  RightOutlined
} from '@ant-design/icons'
import { createTheme, registerIcons } from 'office-ui-fabric-react/lib/Styling'
import { Customizations } from 'office-ui-fabric-react/lib/Utilities'

import { ConfigProvider } from 'antd'
import i18next from 'i18next'
import enUS from 'antd/es/locale/en_US'
import zhCN from 'antd/es/locale/zh_CN'

registerIcons({
  icons: {
    SortUp: <ArrowUpOutlined />,
    SortDown: <ArrowDownOutlined />,
    chevronrightmed: <RightOutlined />,
    tag: <DownOutlined />
  }
})

const theme = createTheme({
  defaultFontStyle: { fontFamily: 'inherit', fontSize: '1em' }
})

Customizations.applySettings({ theme })

export default function Root({ children }) {
  return (
    <ConfigProvider locale={i18next.language === 'en' ? enUS : zhCN}>
      {children}
    </ConfigProvider>
  )
}
