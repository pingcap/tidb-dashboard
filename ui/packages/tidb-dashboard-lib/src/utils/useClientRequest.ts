import { useMount, useUnmount, useMemoizedFn } from 'ahooks'
import { useState, useRef, useEffect } from 'react'
import axios, { CancelToken, AxiosPromise, CancelTokenSource } from 'axios'

import { ReqConfig } from '@lib/types'

interface ClientReqConfig extends ReqConfig {
  cancelToken: CancelToken
}

export interface RequestFactory<T> {
  (reqConfig: ClientReqConfig): AxiosPromise<T>
}

interface Options {
  immediate?: boolean
  afterRequest?: () => void
  beforeRequest?: () => void
}

interface State<T> {
  isLoading: boolean
  data?: T
  error?: any
}

export function useClientRequest<T>(
  reqFactory?: RequestFactory<T>,
  options?: Options
) {
  const {
    immediate = true,
    afterRequest = null,
    beforeRequest = null
  } = options || {}

  const [state, setState] = useState<State<T>>({
    isLoading: immediate
  })

  // If `cancelTokenSource` is null, it means there is no running requests.
  const cancelTokenSource = useRef<CancelTokenSource | null>(null)
  const mounted = useRef(false)

  const sendRequest = useMemoizedFn(async () => {
    if (!mounted.current) {
      return
    }
    if (cancelTokenSource.current) {
      return
    }

    beforeRequest && beforeRequest()

    cancelTokenSource.current = axios.CancelToken.source()

    setState((s) => ({
      ...s,
      isLoading: true,
      error: undefined
    }))

    try {
      if (!reqFactory) {
        setState({
          isLoading: false
        })
      } else {
        const reqConfig: ClientReqConfig = {
          cancelToken: cancelTokenSource.current.token,
          handleError: 'custom' // handle the error by component self
        }
        const resp = await reqFactory(reqConfig)
        if (mounted.current) {
          setState({
            data: resp.data,
            isLoading: false
          })
        }
      }
    } catch (e) {
      if (mounted.current) {
        setState({
          error: e,
          isLoading: false
        })
      }
    }

    cancelTokenSource.current = null

    afterRequest && afterRequest()
  })

  useMount(() => {
    mounted.current = true
    if (immediate) {
      sendRequest()
    }
  })

  useUnmount(() => {
    mounted.current = false
    if (cancelTokenSource.current != null) {
      cancelTokenSource.current.cancel()
      cancelTokenSource.current = null
    }
  })

  return {
    ...state,
    sendRequest
  }
}

interface OptionsWithPolling<T> extends Options {
  pollingInterval?: number
  shouldPoll?: ((data: T) => boolean) | null
}

export function useClientRequestWithPolling<T = any>(
  reqFactory: RequestFactory<T>,
  options?: OptionsWithPolling<T>
) {
  const {
    pollingInterval = 1000,
    shouldPoll = null,
    afterRequest = null,
    beforeRequest = null,
    immediate = true
  } = options || {}
  const mounted = useRef(false)
  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleNextPoll = () => {
    if (pollingTimer.current == null && mounted.current) {
      pollingTimer.current = setTimeout(() => {
        retRef.current.sendRequest()
        pollingTimer.current = null
      }, pollingInterval)
    }
  }

  const cancelNextPoll = () => {
    if (pollingTimer.current != null) {
      clearTimeout(pollingTimer.current)
      pollingTimer.current = null
    }
  }

  const myBeforeRequest = () => {
    beforeRequest?.()
    cancelNextPoll()
  }

  const myAfterRequest = () => {
    let triggerPoll = true
    if (retRef.current.error) {
      triggerPoll = false
    } else if (retRef.current.data && shouldPoll) {
      triggerPoll = shouldPoll(retRef.current.data)
    }
    if (triggerPoll) {
      scheduleNextPoll()
    }
    afterRequest?.()
  }

  const ret = useClientRequest(reqFactory, {
    immediate,
    beforeRequest: myBeforeRequest,
    afterRequest: myAfterRequest
  })

  const retRef = useRef(ret)

  useEffect(() => {
    retRef.current = ret
  }, [ret])

  useMount(() => {
    mounted.current = true
  })

  useUnmount(() => {
    mounted.current = false
    cancelNextPoll()
  })

  return ret
}
