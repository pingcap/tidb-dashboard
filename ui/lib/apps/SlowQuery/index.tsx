import React from 'react'
import { Root } from '@lib/components'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import { List, Detail } from './pages'
import useSlowQuery from './utils/useSlowQuery'

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
            <Route path="/slow_query" element={<List />} />
            <Route path="/slow_query/detail" element={<Detail />} />
          </Routes>
        </Router>
      </ConfigProvider>
    </Root>
  )
}

export * from './components'
export * from './pages'
export { useSlowQuery }
