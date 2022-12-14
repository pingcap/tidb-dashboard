import { TimeRange } from '@lib/components'
import { useMemo } from 'react'
import { useQueryParams } from './useQueryParams'

export const useURLTimeRange = () => {
  const { queryParams, setQueryParams } = useQueryParams<{
    from: number | string
    to: number | string
  }>({
    from: 30 * 60,
    to: 'now'
  })
  const { from, to } = queryParams
  const isRecent = to === 'now'
  const timeRange: TimeRange = useMemo(
    () =>
      ({
        type: isRecent ? 'recent' : 'absolute',
        value: isRecent
          ? parseInt(`${from}`)
          : [parseInt(`${from}`), parseInt(`${to}`)]
      } as TimeRange),
    [from, to, isRecent]
  )
  const setTimeRange = (tr: TimeRange) => {
    const isRecent = tr.type === 'recent'
    setQueryParams({
      from: isRecent ? tr.value : tr.value[0],
      to: isRecent ? 'now' : tr.value[1]
    })
  }

  return { timeRange, setTimeRange }
}
