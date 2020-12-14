import React from 'react'
import { HashRouter as Router } from 'react-router-dom'
import { ParamsPageWrapper, Root } from '@lib/components'
import Timeline from './pages/Timeline'

export default () => {
  return (
    <Root>
      <Router>
        <ParamsPageWrapper>
          <Timeline />
        </ParamsPageWrapper>
      </Router>
    </Root>
  )
}
