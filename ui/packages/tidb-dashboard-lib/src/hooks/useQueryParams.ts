import { useCallback, useEffect, useMemo } from 'react'

import { NavigateOptions, useLocation, useNavigate } from 'react-router-dom'

export interface IQueryParams {
  [key: string]: any
}

function parseQueryParams<T extends IQueryParams>(
  search: string,
  defParams: Partial<T> = {},
  override?: Partial<T>
) {
  const searchParams = new URLSearchParams(search)
  const params: IQueryParams = {
    ...defParams,
    ...override
  }

  for (const [key, value] of searchParams.entries()) {
    const defVal = defParams[key]
    if (defVal !== undefined) {
      if (typeof defVal === 'number') {
        params[key] = Number(value)
      } else if (typeof defVal === 'boolean') {
        params[key] = value === 'true'
      } else if (Array.isArray(defVal)) {
        params[key] = value === '' ? [] : value.split(',')
      } else {
        params[key] = value
      }
    } else {
      params[key] = value
    }
  }

  return params as T
}

export function useQueryParams<T extends IQueryParams = IQueryParams>(
  defParams?: T,
  override?: T,
  options?: NavigateOptions
) {
  const location = useLocation()
  const navigate = useNavigate()

  const queryParams = useMemo(
    () => parseQueryParams(location.search, defParams, override),
    [location.search, defParams, override]
  )

  useEffect(() => {
    // redirect if params are not default when mount
    if (override) {
      setQueryParams(queryParams as Partial<T>)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setQueryParams = useCallback(
    (p: Partial<T>) => {
      const params = { ...queryParams, ...p } as IQueryParams
      const prevSearchStr = location.search
      const searchParams = new URLSearchParams()

      Object.keys(params).forEach((key) => {
        const value = params[key]

        if (
          value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)
        ) {
          return
        }

        searchParams.set(
          key,
          Array.isArray(value) ? value.join(',') : String(value)
        )
      })

      const nextQueryString = searchParams.toString()
      const nextSearchStr = nextQueryString ? `?${nextQueryString}` : ''

      if (prevSearchStr === nextSearchStr) {
        return
      }

      navigate(
        `${location.pathname}${nextSearchStr}${location.hash ?? ''}`,
        options
      )
    },
    [
      location.hash,
      location.pathname,
      location.search,
      navigate,
      options,
      queryParams
    ]
  )

  return { queryParams, setQueryParams }
}
