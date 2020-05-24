import { useEffect, useMemo, useState } from 'react'
import { useSessionStorageState } from '@umijs/hooks'

import client, { SlowqueryBase } from '@lib/client'
import { calcTimeRange, TimeRange } from '@lib/components'
import useOrderState, { IOrderOptions } from '@lib/utils/useOrderState'

const QUERY_OPTIONS = 'slow_query.query_options'

const DEF_ORDER_OPTIONS: IOrderOptions = {
  orderBy: 'Time',
  desc: true,
}

export interface ISlowQueryOptions {
  timeRange?: TimeRange
  schemas: string[]
  searchText: string
  limit: number

  digest: string
  plans: string[]
}

export const DEF_SLOW_QUERY_OPTIONS: ISlowQueryOptions = {
  timeRange: undefined,
  schemas: [],
  searchText: '',
  limit: 100,

  digest: '',
  plans: [],
}

export default function useSlowQuery(
  options?: ISlowQueryOptions,
  needSave: boolean = true
) {
  const { orderOptions, changeOrder } = useOrderState(
    'slow_query',
    needSave,
    DEF_ORDER_OPTIONS
  )

  const [memoryQueryOptions, setMemoryQueryOptions] = useState(
    options || DEF_SLOW_QUERY_OPTIONS
  )
  const [sessionQueryOptions, setSessionQueryOptions] = useSessionStorageState(
    QUERY_OPTIONS,
    options || DEF_SLOW_QUERY_OPTIONS
  )
  const queryOptions = useMemo(
    () => (needSave ? sessionQueryOptions : memoryQueryOptions),
    [needSave, memoryQueryOptions, sessionQueryOptions]
  )
  const queryTimeRange = useMemo(() => {
    const [beginTime, endTime] = calcTimeRange(queryOptions.timeRange)
    return { beginTime, endTime }
  }, [queryOptions])

  const [loadingSlowQueries, setLoadingSlowQueries] = useState(true)
  const [slowQueries, setSlowQueries] = useState<SlowqueryBase[]>([])
  const [refreshTimes, setRefreshTimes] = useState(0)

  function setQueryOptions(newOptions: ISlowQueryOptions) {
    if (needSave) {
      setSessionQueryOptions(newOptions)
    } else {
      setMemoryQueryOptions(newOptions)
    }
  }

  function refresh() {
    setRefreshTimes((prev) => prev + 1)
  }

  useEffect(() => {
    async function getSlowQueryList() {
      setLoadingSlowQueries(true)
      const res = await client
        .getInstance()
        .slowQueryListGet(
          queryOptions.schemas,
          orderOptions.desc,
          queryOptions.digest,
          queryOptions.limit,
          queryTimeRange.endTime,
          queryTimeRange.beginTime,
          orderOptions.orderBy,
          queryOptions.plans,
          queryOptions.searchText
        )
      setLoadingSlowQueries(false)
      setSlowQueries(res.data || [])
    }
    getSlowQueryList()
  }, [queryOptions, orderOptions, queryTimeRange, refreshTimes])

  return {
    queryOptions,
    setQueryOptions,
    orderOptions,
    changeOrder,
    refresh,

    loadingSlowQueries,
    slowQueries,
    queryTimeRange,
  }
}
