import { Root } from '@lib/components'
import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import DatabaseList from './pages/DatabaseList'
import DBTableList from './pages/DBTableList'
import DBTableDetail from './pages/DBTableDetail'
import DBTableStructure from './pages/DBTableStructure'
import DBTableNew from './pages/DBTableNew'

const App = () => {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/data" element={<DatabaseList />} />
          <Route path="/data/tables" element={<DBTableList />} />
          <Route path="/data/table_new" element={<DBTableNew />} />
          <Route path="/data/table_detail" element={<DBTableDetail />} />
          <Route path="/data/table_structure" element={<DBTableStructure />} />
        </Routes>
      </Router>
    </Root>
  )
}

export default App
