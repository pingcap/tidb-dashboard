import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root, ParamsPageWrapper } from '@lib/components'
import ListPage from './pages/List'

const App = () => {
  return (
    <Root>
      <Router>
        <Routes>
          <Route
            path="/cluster_info/:tabKey"
            element={
              <ParamsPageWrapper>
                <ListPage />
              </ParamsPageWrapper>
            }
          />
          <Route path="/cluster_info" element={<ListPage />} />
        </Routes>
      </Router>
    </Root>
  )
}

export default App
