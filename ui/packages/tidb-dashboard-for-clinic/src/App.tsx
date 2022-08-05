import React, { useEffect, useState } from 'react'
import SlowQuery from './apps/SlowQuery'

function getLocHashPrefix() {
  let urlHashPath = window.location.hash
  const questionMarkPos = urlHashPath.indexOf('?')
  if (questionMarkPos > 0) {
    urlHashPath = urlHashPath.slice(0, questionMarkPos)
  }
  return urlHashPath.split('/')[1]
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
