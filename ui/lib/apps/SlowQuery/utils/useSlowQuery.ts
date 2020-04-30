import { useState, useEffect } from 'react'
import client, { SlowqueryBase } from '@lib/client'
import { TimeRange, DEF_TIME_RANGE, calcTimeRange } from '@lib/components'
import { useSessionStorageState } from '@umijs/hooks'

const QUERY_OPTIONS = 'slow_query.query_options'

export interface IQueryOptions {
  timeRange: TimeRange
  schemas: string[]
  searchText: string
  orderBy: string
  desc: boolean
  limit: number

  digest: string
  plans: string[]
}

export function getDefQueryOptions(): IQueryOptions {
  return {
    timeRange: DEF_TIME_RANGE,
    schemas: [],
    searchText: '',
    orderBy: 'Time',
    desc: true,
    limit: 100,
    digest: '',
    plans: [],
  }
}

export default function useSlowQuery(
  options?: IQueryOptions,
  needSave: boolean = true
) {
  const [queryOptions, setQueryOptions] = useState(() =>
    options ? options : getDefQueryOptions()
  )
  const [savedQueryOptions, setSavedQueryOptions] = useSessionStorageState(
    QUERY_OPTIONS,
    options ? options : getDefQueryOptions()
  )
  const [loadingSlowQueries, setLoadingSlowQueries] = useState(true)
  const [slowQueries, setSlowQueries] = useState<SlowqueryBase[]>([])
  const [refreshTimes, setRefreshTimes] = useState(0)

  function refresh() {
    setRefreshTimes((prev) => prev + 1)
  }

  useEffect(() => {
    async function getSlowQueryList() {
      setLoadingSlowQueries(true)
      let curOptions = needSave ? savedQueryOptions : queryOptions
      const [beginTime, endTime] = calcTimeRange(curOptions.timeRange)
      const res = await client
        .getInstance()
        .slowQueryListGet(
          curOptions.schemas,
          curOptions.desc,
          curOptions.digest,
          curOptions.limit,
          endTime,
          beginTime,
          curOptions.orderBy,
          curOptions.plans,
          curOptions.searchText
        )
      setLoadingSlowQueries(false)
      setSlowQueries(res.data || [])
    }
    getSlowQueryList()
  }, [queryOptions, savedQueryOptions, needSave, refreshTimes])

  return {
    queryOptions,
    setQueryOptions,
    savedQueryOptions,
    setSavedQueryOptions,
    loadingSlowQueries,
    slowQueries,
    refresh,
  }
}
