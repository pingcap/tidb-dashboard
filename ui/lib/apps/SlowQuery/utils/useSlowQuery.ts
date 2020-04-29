import { useState, useEffect, useMemo } from 'react'
import client, { SlowqueryBase } from '@lib/client'
import { TimeRange, DEF_TIME_RANGE, calcTimeRange } from '@lib/components'
import { useSessionStorageState } from '@umijs/hooks'

const QUERY_OPTIONS = 'slow_query.query_options'

export interface ISlowQueryOptions {
  timeRange: TimeRange
  schemas: string[]
  searchText: string
  orderBy: string
  desc: boolean
  limit: number

  digest: string
  plans: string[]
}

export const DEF_SLOW_QUERY_OPTIONS: ISlowQueryOptions = {
  timeRange: DEF_TIME_RANGE,
  schemas: [],
  searchText: '',
  orderBy: 'Time',
  desc: true,
  limit: 100,
  digest: '',
  plans: [],
}

export default function useSlowQuery(
  options?: ISlowQueryOptions,
  needSave: boolean = true
) {
  const [queryOptions, setQueryOptions] = useState(
    () => options || DEF_SLOW_QUERY_OPTIONS
  )
  const [savedQueryOptions, setSavedQueryOptions] = useSessionStorageState(
    QUERY_OPTIONS,
    options || DEF_SLOW_QUERY_OPTIONS
  )
  const [loadingSlowQueries, setLoadingSlowQueries] = useState(true)
  const [slowQueries, setSlowQueries] = useState<SlowqueryBase[]>([])
  const [refreshTimes, setRefreshTimes] = useState(0)

  const queryTimeRange = useMemo(() => {
    let curOptions = needSave ? savedQueryOptions : queryOptions
    const [beginTime, endTime] = calcTimeRange(curOptions.timeRange)
    return { beginTime, endTime }
  }, [queryOptions, savedQueryOptions, needSave])

  function refresh() {
    setRefreshTimes((prev) => prev + 1)
  }

  useEffect(() => {
    async function getSlowQueryList() {
      setLoadingSlowQueries(true)
      let curOptions = needSave ? savedQueryOptions : queryOptions
      const res = await client
        .getInstance()
        .slowQueryListGet(
          curOptions.schemas,
          curOptions.desc,
          curOptions.digest,
          curOptions.limit,
          queryTimeRange.endTime,
          queryTimeRange.beginTime,
          curOptions.orderBy,
          curOptions.plans,
          curOptions.searchText
        )
      setLoadingSlowQueries(false)
      setSlowQueries(res.data || [])
    }
    getSlowQueryList()
  }, [queryOptions, savedQueryOptions, needSave, queryTimeRange, refreshTimes])

  return {
    queryOptions,
    setQueryOptions,
    savedQueryOptions,
    setSavedQueryOptions,
    loadingSlowQueries,
    slowQueries,
    queryTimeRange,
    refresh,
  }
}
