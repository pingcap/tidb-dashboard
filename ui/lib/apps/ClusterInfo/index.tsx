import React from 'react'
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom'

import { Root, ParamsPageWrapper } from '@lib/components'
import ListPage from './pages/List'

const App = () => {
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
