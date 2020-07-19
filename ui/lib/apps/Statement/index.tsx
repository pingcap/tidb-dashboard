import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'
import { List, Detail } from './pages'
import useStatement from './utils/useStatement'

import { ConfigProvider } from 'antd'
import i18next from 'i18next'
import enUS from 'antd/es/locale/en_US'
import zhCN from 'antd/es/locale/zh_CN'

export default function () {
  return (
    <Root>
      <ConfigProvider locale={i18next.language == 'en' ? enUS : zhCN}>
        <Router>
          <Routes>
            <Route path="/statement" element={<List />} />
            <Route path="/statement/detail" element={<Detail />} />
          </Routes>
        </Router>
      </ConfigProvider>
    </Root>
  )
}

export * from './components'
export * from './pages'
export { useStatement }
