import React, { useEffect, useState } from 'react'
import SlowQuery from './apps/SlowQuery'

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

  if (locHashPrefix === 'slow_query') {
    return <SlowQuery />
  }

  return <p>No Matched Route!</p>
}
