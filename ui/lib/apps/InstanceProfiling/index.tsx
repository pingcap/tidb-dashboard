import React from 'react'
import {
  HashRouter as Router,
  Route,
  Routes,
  useParams,
} from 'react-router-dom'

import { Root } from '@lib/components'
import { Detail, List } from './pages'

function DetailPageWrapper() {
  const { id } = useParams()

  return <Detail key={id} />
}

const App = () => (
  <Root>
    <Router>
      <Routes>
        <Route path="/instance_profiling" element={<List />} />
        <Route path="/instance_profiling/:id" element={<DetailPageWrapper />} />
      </Routes>
    </Router>
  </Root>
)

export default App
