import React from 'react'

import {
  HelloCSS,
  HelloLess,
  HelloMLess,
  HelloSCSS,
  HelloAntD,
  HelloFluentUI,
  HelloAntDIcons,
  HelloSVG,
  HelloYAML,
  HelloDynamicImport
} from '@lib/test-components'

import './style.less'

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
      <HelloDynamicImport />
    </div>
  )
}
