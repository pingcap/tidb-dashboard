import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { ParamsPageWrapper, Root } from '@lib/components'
import { DiagnoseGenerator, DiagnoseStatus } from './pages'

import { ConfigProvider } from 'antd'
import i18next from 'i18next'
import enUS from 'antd/es/locale/en_US'
import zhCN from 'antd/es/locale/zh_CN'

const App = () => (
  <Root>
    <ConfigProvider locale={i18next.language === 'en' ? enUS : zhCN}>
      <Router>
        <Routes>
          <Route path="/diagnose" element={<DiagnoseGenerator />} />
          <Route
            path="/diagnose/:id"
            element={
              <ParamsPageWrapper>
                <DiagnoseStatus />
              </ParamsPageWrapper>
            }
          />
        </Routes>
      </Router>
    </ConfigProvider>
  </Root>
)

export default App
