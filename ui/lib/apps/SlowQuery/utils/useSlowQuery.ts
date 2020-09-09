import { useEffect, useMemo, useState } from 'react'
import { useSessionStorageState } from '@umijs/hooks'

import client, { SlowquerySlowQuery } from '@lib/client'
import { calcTimeRange, TimeRange, IColumnKeys } from '@lib/components'
import useOrderState, { IOrderOptions } from '@lib/utils/useOrderState'

import { slowQueryColumns } from './tableColumns'
import { getSelectedFields } from '@lib/utils/tableColumnFactory'

const QUERY_OPTIONS = 'slow_query.query_options'

const DEF_ORDER_OPTIONS: IOrderOptions = {
  orderBy: 'timestamp',
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
  visibleColumnKeys: IColumnKeys,
  showFullSQL: boolean,
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

  const [allSchemas, setAllSchemas] = useState<string[]>([])
  const [loadingSlowQueries, setLoadingSlowQueries] = useState(true)
  const [slowQueries, setSlowQueries] = useState<SlowquerySlowQuery[]>([])
  const [refreshTimes, setRefreshTimes] = useState(0)

  function setQueryOptions(newOptions: ISlowQueryOptions) {
    if (needSave) {
      setSessionQueryOptions(newOptions)
    } else {
      setMemoryQueryOptions(newOptions)
    }
  }

  const [errors, setErrors] = useState<any[]>([])

  function refresh() {
    setErrors([])
    setRefreshTimes((prev) => prev + 1)
  }

  useEffect(() => {
    async function querySchemas() {
      try {
        const res = await client.getInstance().infoListDatabases()
        setAllSchemas(res?.data || [])
      } catch (error) {
        setErrors((prev) => [...prev, { ...error }])
      }
    }
    querySchemas()
  }, [])

  // Notice: slowQueries, tableColumns, selectedFields make loop dependencies
  const tableColumns = useMemo(
    () => slowQueryColumns(slowQueries, showFullSQL),
    [slowQueries, showFullSQL]
  )
  // make selectedFields as a string instead of an array to avoid infinite loop
  // I have verified that it will cause infinite loop if we return selectedFields as an array
  // so it is better to use the basic type (string, number...) instead of object as the dependency
  const selectedFields = useMemo(
    () => getSelectedFields(visibleColumnKeys, tableColumns).join(','),
    [visibleColumnKeys, tableColumns]
  )
  useEffect(() => {
    async function getSlowQueryList() {
      setLoadingSlowQueries(true)
      try {
        const res = await client
          .getInstance()
          .slowQueryListGet(
            queryOptions.schemas,
            orderOptions.desc,
            queryOptions.digest,
            selectedFields,
            queryOptions.limit,
            queryTimeRange.endTime,
            queryTimeRange.beginTime,
            orderOptions.orderBy,
            queryOptions.plans,
            queryOptions.searchText
          )
        setSlowQueries(res.data || [])
        setErrors([])
      } catch (error) {
        setErrors((prev) => [...prev, { ...error }])
      }
      setLoadingSlowQueries(false)
    }

    getSlowQueryList()
  }, [queryOptions, orderOptions, queryTimeRange, refreshTimes, selectedFields])

  return {
    queryOptions,
    setQueryOptions,
    orderOptions,
    changeOrder,
    refresh,

    allSchemas,
    loadingSlowQueries,
    slowQueries,
    queryTimeRange,

    errors,

    tableColumns,
  }
}
