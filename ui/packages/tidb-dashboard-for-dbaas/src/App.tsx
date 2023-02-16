import React, { useEffect, useState } from 'react'
import Statement from './apps/Statement'
import SlowQuery from './apps/SlowQuery'
import KeyViz from './apps/KeyViz'
import TopSQL from './apps/TopSQL'
import Monitoring from './apps/Monitoring'
import SQLAdvisor from './apps/SQLAdvisor'

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

  if (locHashPrefix.startsWith('statement')) {
    return <Statement />
  }

  if (locHashPrefix.startsWith('slow_query')) {
    return <SlowQuery />
  }

  if (locHashPrefix.startsWith('keyviz')) {
    return <KeyViz />
  }

  if (locHashPrefix.startsWith('topsql')) {
    return <TopSQL />
  }

  if (locHashPrefix.startsWith('monitoring')) {
    return <Monitoring />
  }

  if (locHashPrefix === 'sql_advisor') {
    return <SQLAdvisor />
  }

  return <p>No Matched Route!</p>
}
