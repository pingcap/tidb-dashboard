import React from 'react'
import './style.less'

import HelloCSS from './lib/test-components/HelloCSS'
import HelloLess from './lib/test-components/HelloLess'
import HelloMLess from './lib/test-components/HelloModuleLess'
import HelloSCSS from './lib/test-components/HelloSCSS'
import HelloAntD from './lib/test-components/HelloAntD'
import HelloFluentUI from './lib/test-components/HelloFluentUI'
import HelloAntDIcons from './lib/test-components/HelloAntDIcons'
import HelloSVG from './lib/test-components/HelloSVG'
import HelloYAML from './lib/test-components/HelloYAML'

export default function App() {
  return (
    <div>
      <HelloCSS />
      <HelloLess />
      <HelloMLess />
      <HelloSCSS />
      <HelloAntD />
      <HelloFluentUI />
      <HelloAntDIcons />
      <HelloSVG />
      <HelloYAML />
    </div>
  )
}
