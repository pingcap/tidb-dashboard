import { useMount, useUnmount } from '@umijs/hooks'
import { useState, useRef, useCallback, useEffect } from 'react'
import { CancelToken, AxiosPromise, CancelTokenSource } from 'axios'
import axios from 'axios'

interface RequestFactory<T> {
  (token: CancelToken): AxiosPromise<T>
}

interface Options {
  immediate: boolean
  afterRequest?: () => void
  beforeRequest?: () => void
}

interface State<T> {
  isLoading: boolean
  data?: T
  error?: any
}

export function useClientRequest<T>(
  reqFactory: RequestFactory<T>,
  options?: Options
) {
  const { immediate = true, afterRequest = null, beforeRequest = null } =
    options || {}

  const [state, setState] = useState<State<T>>({
    isLoading: false,
  })

  const cancelTokenSource = useRef<CancelTokenSource | null>(null)
  const mounted = useRef(false)

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const sendRequest = async () => {
    if (!mounted.current) {
      return
    }
    if (stateRef.current.isLoading) {
      return
    }

    beforeRequest && beforeRequest()

    cancelTokenSource.current = axios.CancelToken.source()
    setState((s) => ({
      ...s,
      isLoading: true,
      error: undefined,
    }))

    try {
      const resp = await reqFactory(cancelTokenSource.current.token)
      if (mounted.current) {
        setState({
          data: resp.data,
          isLoading: false,
        })
      }
    } catch (e) {
      if (mounted.current) {
        setState({
          error: e,
          isLoading: false,
        })
      }
    }

    cancelTokenSource.current = null

    afterRequest && afterRequest()
  }

  const cancelLastRequest = useCallback(() => {
    if (cancelTokenSource.current != null) {
      cancelTokenSource.current.cancel()
      cancelTokenSource.current = null
    }
  }, [])

  useMount(() => {
    mounted.current = true
    if (immediate) {
      sendRequest()
    }
  })

  useUnmount(() => {
    mounted.current = false
    cancelLastRequest()
  })

  return {
    ...state,
    sendRequest,
  }
}

export interface BatchState<T> {
  isLoading: boolean
  data: (T | null)[]
  error: (any | null)[]
}

export function useBatchClientRequest<T>(
  reqFactories: RequestFactory<T>[],
  options?: Options
) {
  const { immediate = true, afterRequest = null, beforeRequest = null } =
    options || {}

  const [state, setState] = useState<BatchState<T>>({
    isLoading: false,
    data: reqFactories.map((_) => null),
    error: reqFactories.map((_) => null),
  })

  const cancelTokenSource = useRef<CancelTokenSource[] | null>(null)
  const mounted = useRef(false)

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const sendRequestEach = async (idx) => {
    try {
      const resp = await reqFactories[idx](
        cancelTokenSource.current![idx].token
      )
      if (mounted.current) {
        setState((s) => {
          s.data[idx] = resp.data
          return { ...s, data: [...s.data] }
        })
      }
    } catch (e) {
      if (mounted.current) {
        setState((s) => {
          s.error[idx] = e
          return { ...s, error: [...s.error] }
        })
      }
    }
  }

  const sendRequest = async () => {
    if (!mounted.current) {
      return
    }
    if (stateRef.current.isLoading) {
      return
    }

    beforeRequest && beforeRequest()

    cancelTokenSource.current = reqFactories.map((_) =>
      axios.CancelToken.source()
    )
    setState((s) => ({
      ...s,
      isLoading: true,
      error: reqFactories.map((_) => null),
    }))

    const p = reqFactories.map((_, idx) => sendRequestEach(idx))
    await Promise.all(p)
    setState((s) => ({
      ...s,
      isLoading: false,
    }))

    cancelTokenSource.current = null

    afterRequest && afterRequest()
  }

  const cancelLastRequest = useCallback(() => {
    if (cancelTokenSource.current != null) {
      cancelTokenSource.current.forEach((c) => c.cancel())
      cancelTokenSource.current = null
    }
  }, [])

  useMount(() => {
    mounted.current = true
    if (immediate) {
      sendRequest()
    }
  })

  useUnmount(() => {
    mounted.current = false
    cancelLastRequest()
  })

  return {
    ...state,
    sendRequest,
  }
}

interface OptionsWithPolling<T> extends Options {
  pollingInterval: number
  shouldPoll: ((data: T) => boolean) | null
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
    immediate = true,
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
    afterRequest: myAfterRequest,
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
