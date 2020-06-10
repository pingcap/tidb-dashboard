import React from 'react'
import ReactDOM from 'react-dom'

window.addEventListener(
  'message',
  (event) => {
    console.log('event:', event)
    if (event.data.token) {
      ReactDOM.render(
        <div>DBass Portal: {event.data.token}</div>,
        document.getElementById('root')
      )
    }
  },
  false
)
