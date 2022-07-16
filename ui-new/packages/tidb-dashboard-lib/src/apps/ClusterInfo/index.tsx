import React, { useContext } from 'react'
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom'

import { Root } from '@lib/components'
import ListPage from './pages/List'

import { addTranslations } from '@lib/utils/i18n'
import { useLocationChange } from '@lib/hooks/useLocationChange'
import { ClusterInfoContext } from './context'
import translations from './translations'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route
        path="/cluster_info"
        element={<Navigate to="/cluster_info/instance" replace />}
      />
      <Route path="/cluster_info/:tabKey" element={<ListPage />} />
    </Routes>
  )
}

const App = () => {
  const ctx = useContext(ClusterInfoContext)
  if (ctx === null) {
    throw new Error('ClusterInfoContext must not be null')
  }

  return (
    <Root>
      <Router>
        <AppRoutes />
      </Router>
    </Root>
  )
}

export default App

export * from './context'
