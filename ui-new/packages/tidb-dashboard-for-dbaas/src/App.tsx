import React, { useEffect, useState } from 'react'
import Statement from './apps/Statement'
import SlowQuery from './apps/SlowQuery'
import KeyViz from './apps/KeyViz'

function getLocHashPrefix() {
  return window.location.hash.split('/')[1]
}

export default function () {
  const [locHashPrefix, setLocHashPrefix] = useState(() => getLocHashPrefix())

  useEffect(() => {
    const timerId = setInterval(() => {
      const curLocHashPrefix = getLocHashPrefix()
      if (curLocHashPrefix !== locHashPrefix) {
        setLocHashPrefix(curLocHashPrefix)
      }
    }, 200)

    return () => clearInterval(timerId)
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

  return <p>No Matched Route!</p>
}
