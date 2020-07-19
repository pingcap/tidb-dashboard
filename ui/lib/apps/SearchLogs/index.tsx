import React from 'react'
import { Root, ParamsPageWrapper } from '@lib/components'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { LogSearch, LogSearchHistory, LogSearchDetail } from './pages'

import { ConfigProvider } from 'antd'
import i18next from 'i18next'
import enUS from 'antd/es/locale/en_US'
import zhCN from 'antd/es/locale/zh_CN'

export default function () {
  return (
    <Root>
      <ConfigProvider locale={i18next.language === 'en' ? enUS : zhCN}>
        <Router>
          <Routes>
            <Route path="/search_logs" element={<LogSearch />} />
            <Route path="/search_logs/history" element={<LogSearchHistory />} />
            <Route
              path="/search_logs/detail/:id"
              element={
                <ParamsPageWrapper>
                  <LogSearchDetail />
                </ParamsPageWrapper>
              }
            />
          </Routes>
        </Router>
      </ConfigProvider>
    </Root>
  )
}
