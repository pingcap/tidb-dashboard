import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root, ParamsPageWrapper } from '@lib/components'
import { Detail, List } from './pages'

import { ConfigProvider } from 'antd'
import i18next from 'i18next'
import enUS from 'antd/es/locale/en_US'
import zhCN from 'antd/es/locale/zh_CN'

const App = () => (
  <Root>
    <ConfigProvider locale={i18next.language === 'en' ? enUS : zhCN}>
      <Router>
        <Routes>
          <Route path="/instance_profiling" element={<List />} />
          <Route
            path="/instance_profiling/:id"
            element={
              <ParamsPageWrapper>
                <Detail />
              </ParamsPageWrapper>
            }
          />
        </Routes>
      </Router>
    </ConfigProvider>
  </Root>
)

export default App
