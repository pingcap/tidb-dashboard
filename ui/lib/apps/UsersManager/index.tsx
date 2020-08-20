import { Root } from '@lib/components'
import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import DBUserList from './pages/DBUserList'

const App = () => {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/dbusers" element={<DBUserList />} />
        </Routes>
      </Router>
    </Root>
  )
}

export default App
