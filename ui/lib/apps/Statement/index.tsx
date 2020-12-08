import React from 'react'
import { HashRouter as Router } from 'react-router-dom'

import { Root } from '@lib/components'
import { Detail, List } from './pages'
import ListAndDetail from '@lib/components/ListAndDetail'

export default function () {
  return (
    <Root>
      <Router>
        <ListAndDetail
          DetailComponent={Detail}
          ListComponent={List}
          detailPathMatcher={(path) => path.startsWith('/statement/detail')}
        />
      </Router>
    </Root>
  )
}

export * from './components'
export * from './pages'
export * from './utils/useStatementTableController'
export { default as useStatementTableController } from './utils/useStatementTableController'
