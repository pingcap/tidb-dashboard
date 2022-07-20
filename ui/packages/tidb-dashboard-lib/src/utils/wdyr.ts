import React from 'react'

if (process.env.NODE_ENV === 'development') {
  console.log('Development mode, enable render trackers')
  const whyDidYouRender = require('@welldone-software/why-did-you-render')
  whyDidYouRender(React)
}
