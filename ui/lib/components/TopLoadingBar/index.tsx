import React, { useRef, useEffect } from 'react'
import LoadingBar from 'react-top-loading-bar'

const useLoadingBar = () => {
  const loadingBar = useRef<LoadingBar>(null)

  useEffect(() => {
    function startLoading() {
      loadingBar?.current?.continuousStart()
    }
    window.addEventListener('single-spa:before-routing-event', startLoading)
    return () =>
      window.removeEventListener(
        'single-spa:before-routing-event',
        startLoading
      )
  }, [])

  useEffect(() => {
    function completeLoading() {
      loadingBar?.current?.complete()
    }
    window.addEventListener('single-spa:routing-event', completeLoading)
    return () =>
      window.removeEventListener('single-spa:routing-event', completeLoading)
  }, [])

  return loadingBar
}

export default function TopLoadinngBar() {
  const loadingBar = useLoadingBar()
  return <LoadingBar ref={loadingBar} />
}
