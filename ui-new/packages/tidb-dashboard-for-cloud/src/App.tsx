import React, { useEffect, useState } from 'react'
import KeyViz from './apps/KeyViz'
import SlowQuery from './apps/SlowQuery'
import Statement from './apps/Statement'

function getLocHashPrefix() {
  return window.location.hash.split('/')[1]
}

export default function () {
  const [locHashPrefix, setLocHashPrefix] = useState(getLocHashPrefix())

  useEffect(() => {
    function onHashChange() {
      setLocHashPrefix(getLocHashPrefix())
    }

    window.addEventListener('hashchange', onHashChange, false)

    return () => {
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  if (locHashPrefix === 'statement') {
    return <Statement />
  }

  if (locHashPrefix === 'slow_query') {
    return <SlowQuery />
  }

  if (locHashPrefix === 'keyviz') {
    return <KeyViz />
  }

  return <p>No Matched Route!</p>
}
