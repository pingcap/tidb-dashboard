import { Root } from '@lib/components'
import React from 'react'
import { HashRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import ListPage from './pages/List'

import { ConfigProvider } from 'antd'
import i18next from 'i18next'
import enUS from 'antd/es/locale/en_US'
import zhCN from 'antd/es/locale/zh_CN'

const App = () => {
  return (
    <Root>
      <ConfigProvider locale={i18next.language === 'en' ? enUS : zhCN}>
        <Router>
          <Routes>
            <Route
              path="/cluster_info"
              element={<Navigate to="/cluster_info/instance" replace />}
            />
            <Route path="/cluster_info/:tabKey" element={<ListPage />} />
          </Routes>
        </Router>
      </ConfigProvider>
    </Root>
  )
}

export default App
