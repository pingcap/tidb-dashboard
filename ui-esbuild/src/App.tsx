import React from 'react'
import './style.css'

import HelloCSS from './lib/components/HelloCSS'
import HelloLess from './lib/components/HelloLess'

export default function App() {
  return (
    <div>
      <HelloCSS />
      <HelloLess />
    </div>
  )
}
