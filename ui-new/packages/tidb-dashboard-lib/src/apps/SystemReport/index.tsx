import React, { useContext } from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { ParamsPageWrapper, Root } from '@lib/components'
import { ReportGenerator, ReportStatus } from './pages'

import translations from './translations'
import { addTranslations } from '@lib/utils/i18n'
import { SystemReportContext } from './context'

addTranslations(translations)

const App = () => {
  const ctx = useContext(SystemReportContext)
  if (ctx === null) {
    throw new Error('SystemReportÇontext must not be null')
  }

  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/system_report" element={<ReportGenerator />} />
          <Route
            path="/system_report/detail"
            element={
              <ParamsPageWrapper>
                <ReportStatus />
              </ParamsPageWrapper>
            }
          />
        </Routes>
      </Router>
    </Root>
  )
}

export default App

export * from './context'
