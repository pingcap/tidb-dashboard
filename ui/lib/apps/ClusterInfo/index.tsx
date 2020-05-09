import { Root } from '@lib/components'
import React from 'react'
import { HashRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import ListPage from './pages/List'

const App = () => {
  return (
    <Root>
      <Router>
        <Routes>
          <Route
            exact
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
