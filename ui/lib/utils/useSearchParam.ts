import { useMemo } from 'react'
import { useLocation } from 'react-router'

export default function useSearchParam(
  key: string,
  defValue: string = ''
): string {
  const { search } = useLocation()
  const id = useMemo(() => new URLSearchParams(search).get(key) || defValue, [
    search,
  ])
  return id
}
