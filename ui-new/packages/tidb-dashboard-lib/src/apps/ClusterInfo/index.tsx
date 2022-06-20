import React, { useContext } from 'react'
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom'

import { Root } from '@lib/components'
import ListPage from './pages/List'

import translations from './translations'
import { addTranslations } from '@lib/utils/i18n'
import { ClusterInfoContext } from './context'

addTranslations(translations)

const App = () => {
  const ctx = useContext(ClusterInfoContext)
  if (ctx === null) {
    throw new Error('ClusterInfoContext must not be null')
  }

  return (
    <Root>
      <Router>
        <Routes>
          <Route
            path="/cluster_info"
            element={<Navigate to="/cluster_info/instance" replace />}
          />
          <Route path="/cluster_info/:tabKey" element={<ListPage />} />
        </Routes>
      </Router>
    </Root>
  )
}

export default App

export * from './context'
