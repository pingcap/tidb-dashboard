import React from 'react'
import './style.css'

import HelloCSS from './lib/components/HelloCSS'
import HelloLess from './lib/components/HelloLess'
import HelloMLess from './lib/components/HelloModuleLess'

export default function App() {
  return (
    <div>
      <HelloCSS />
      <HelloLess />
      <HelloMLess />
    </div>
  )
}
