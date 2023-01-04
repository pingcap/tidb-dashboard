import { useEffect, useState } from 'react'

import { NavigateOptions, useLocation, useNavigate } from 'react-router-dom'

export interface IQueryParams {
  [key: string]: any
}

export function useQueryParams<T = IQueryParams>(
  defParams: T,
  override?: T,
  options?: NavigateOptions
) {
  const location = useLocation()
  const navigate = useNavigate()

  const [queryParams, _setQueryParams] = useState(() => {
    let newParams = { ...defParams, ...override }
    const searchParams = new URLSearchParams(location.search)

    for (const [key, value] of searchParams.entries()) {
      const defVal = defParams[key]
      if (defVal !== undefined) {
        if (typeof defVal === 'number') {
          newParams[key] = Number(value)
        } else if (Array.isArray(defVal)) {
          if (value === '') {
            newParams[key] = []
          } else {
            newParams[key] = value.split(',')
          }
        } else {
          newParams[key] = value
        }
      } else {
        newParams[key] = value
      }
    }
    return newParams
  })

  useEffect(() => {
    // redirect if params are not default when mount
    if (override) {
      setQueryParams(queryParams)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setQueryParams(p: T) {
    const params = { ...queryParams, ...p }
    _setQueryParams(params)

    const prevSearchStr = location.search
    const searchParams = new URLSearchParams()
    Object.keys(params).forEach((k) => {
      searchParams.set(k, params[k] + '')
    })
    const currentSearchStr = `?${searchParams.toString()}`

    if (prevSearchStr === currentSearchStr) {
      return
    }
    navigate(`${location.pathname}?${searchParams.toString()}`, options)
  }

  return { queryParams, setQueryParams }
}
