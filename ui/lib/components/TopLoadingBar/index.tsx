import React, { useRef } from 'react'
import { useEventListener } from '@umijs/hooks'
import LoadingBar from 'react-top-loading-bar'

const useLoadingBar = () => {
  const loadingBar = useRef<LoadingBar>()
  useEventListener('single-spa:before-routing-event', () =>
    loadingBar.current.continuousStart()
  )
  useEventListener('single-spa:routing-event', () =>
    loadingBar.current.complete()
  )

  return loadingBar
}

export default function TopLoadingBar() {
  const loadingBar = useLoadingBar()
  return <LoadingBar color="#ffc53d" ref={loadingBar} />
}
