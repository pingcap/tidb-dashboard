import React, { useEffect, useState } from 'react'
import Statement from './apps/Statement'
import SlowQuery from './apps/SlowQuery'
import KeyViz from './apps/KeyViz'
import TopSQL from './apps/TopSQL'
import Overview from './apps/Overview'

function getLocHashPrefix() {
  return window.location.hash.split('/')[1]
}

export default function () {
  const [locHashPrefix, setLocHashPrefix] = useState(() => getLocHashPrefix())

  useEffect(() => {
    function handleRouteChange() {
      const curLocHashPrefix = getLocHashPrefix()
      if (curLocHashPrefix !== locHashPrefix) {
        setLocHashPrefix(curLocHashPrefix)
      }
    }
    window.addEventListener('dashboard:route-change', handleRouteChange)
    return () => {
      window.removeEventListener('dashboard:route-change', handleRouteChange)
    }
  }, [locHashPrefix])

  if (locHashPrefix === 'statement') {
    return <Statement />
  }

  if (locHashPrefix === 'slow_query') {
    return <SlowQuery />
  }

  if (locHashPrefix === 'keyviz') {
    return <KeyViz />
  }

  if (locHashPrefix === 'topsql') {
    return <TopSQL />
  }

  if (locHashPrefix === 'overview') {
    return <Overview />
  }

  return <p>No Matched Route!</p>
}
