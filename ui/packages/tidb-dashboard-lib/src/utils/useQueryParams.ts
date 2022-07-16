import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

export default function useQueryParams() {
  // Note: seems that history.location can be outdated sometimes.

  const { search } = useLocation()

  const params = useMemo(() => {
    const searchParams = new URLSearchParams(search)
    let _params: { [k: string]: any } = {}
    for (const [k, v] of searchParams) {
      _params[k] = v
    }
    return _params
  }, [search])

  return params
}
