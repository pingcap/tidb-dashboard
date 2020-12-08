import React from 'react'
import { Root } from '@lib/components'
import { HashRouter as Router } from 'react-router-dom'
import { Detail, List } from './pages'
import ListAndDetail from '@lib/components/ListAndDetail'

export default function () {
  return (
    <Root>
      <Router>
        <ListAndDetail
          DetailComponent={Detail}
          ListComponent={List}
          detailPathMatcher={(path) => path.startsWith('/slow_query/detail')}
        />
      </Router>
    </Root>
  )
}

export * from './components'
export * from './pages'
export * from './utils/useSlowQueryTableController'
export { default as useSlowQueryTableController } from './utils/useSlowQueryTableController'
