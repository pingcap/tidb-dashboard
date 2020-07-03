import React from 'react'
import { HashRouter as Router } from 'react-router-dom'

import { Root, TopLoadingBar } from '@lib/components'

function App() {
  return (
    <Root>
      <Router>
        <TopLoadingBar />
        <div id="__spa__main__"></div>
      </Router>
    </Root>
  )
}

export default App
