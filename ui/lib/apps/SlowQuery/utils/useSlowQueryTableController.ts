import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSessionStorageState } from 'ahooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'

import client, { ErrorStrategy, SlowquerySlowQuery } from '@lib/client'
import {
  calcTimeRange,
  TimeRange,
  IColumnKeys,
  stringifyTimeRange,
} from '@lib/components'
import useOrderState, { IOrderOptions } from '@lib/utils/useOrderState'

import { getSelectedFields } from '@lib/utils/tableColumnFactory'
import { CacheMgr } from '@lib/utils/useCache'

import { derivedFields, slowQueryColumns } from './tableColumns'

export const DEF_SLOW_QUERY_COLUMN_KEYS: IColumnKeys = {
  query: true,
  timestamp: true,
  query_time: true,
  memory_max: true,
}

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

export interface ISlowQueryTableController {
  queryOptions: ISlowQueryOptions
  setQueryOptions: (options: ISlowQueryOptions) => void
  orderOptions: IOrderOptions
  changeOrder: (orderBy: string, desc: boolean) => void
  refresh: () => void

  allSchemas: string[]
  loadingSlowQueries: boolean
  slowQueries: SlowquerySlowQuery[]
  queryTimeRange: { beginTime: number; endTime: number }

  errors: Error[]

  tableColumns: IColumn[]
  visibleColumnKeys: IColumnKeys

  downloadCSV: () => Promise<void>
  downloading: boolean
}

export default function useSlowQueryTableController(
  slowQueryCacheMgr: CacheMgr | null,
  visibleColumnKeys: IColumnKeys,
  showFullSQL: boolean,
  options?: ISlowQueryOptions,
  needSave: boolean = true
): ISlowQueryTableController {
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
  const [loadingSlowQueries, setLoadingSlowQueries] = useState(false)
  const [slowQueries, setSlowQueries] = useState<SlowquerySlowQuery[]>([])

  function setQueryOptions(newOptions: ISlowQueryOptions) {
    if (needSave) {
      setSessionQueryOptions(newOptions)
    } else {
      setMemoryQueryOptions(newOptions)
    }
  }

  const [errors, setErrors] = useState<Error[]>([])

  function refresh() {
    setErrors([])
    fetchSlowQueryList(true)
  }

  useEffect(() => {
    async function querySchemas() {
      try {
        const res = await client.getInstance().infoListDatabases({
          errorStrategy: ErrorStrategy.Custom,
        })
        setAllSchemas(res?.data || [])
      } catch (e) {
        setErrors((prev) => prev.concat(e))
      }
    }

    querySchemas()
  }, [])

  const selectedFields = useMemo(
    () => getSelectedFields(visibleColumnKeys, derivedFields).join(','),
    [visibleColumnKeys]
  )

  const tableColumns = useMemo(
    () => slowQueryColumns(slowQueries, showFullSQL),
    [slowQueries, showFullSQL]
  )

  const fetchSlowQueryList = useCallback(
    async (force: boolean) => {
      const {
        schemas,
        digest,
        limit,
        plans,
        searchText,
        timeRange,
      } = queryOptions
      const { desc, orderBy } = orderOptions
      const { beginTime, endTime } = queryTimeRange
      const cacheKey = `${schemas.join('_')}_${digest}_${limit}_${plans.join(
        '_'
      )}_${searchText}_${stringifyTimeRange(timeRange)}_${desc}_${orderBy}`
      const cacheItem = slowQueryCacheMgr?.get(cacheKey)
      if (cacheItem && !force) {
        setSlowQueries(cacheItem)
        return
      }

      setLoadingSlowQueries(true)
      try {
        const res = await client
          .getInstance()
          .slowQueryListGet(
            beginTime,
            schemas,
            desc,
            digest,
            endTime,
            selectedFields,
            limit,
            orderBy,
            plans,
            searchText,
            {
              errorStrategy: ErrorStrategy.Custom,
            }
          )
        setSlowQueries(res.data || [])
        slowQueryCacheMgr?.set(cacheKey, res.data || [])
        setErrors([])
      } catch (e) {
        setErrors((prev) => prev.concat(e))
      }
      setLoadingSlowQueries(false)
    },
    [
      queryOptions,
      orderOptions,
      queryTimeRange,
      selectedFields,
      slowQueryCacheMgr,
    ]
  )

  useEffect(() => {
    fetchSlowQueryList(false)
  }, [fetchSlowQueryList])

  const [downloading, setDownloading] = useState(false)

  async function downloadCSV() {
    try {
      setDownloading(true)
      const res = await client.getInstance().slowQueryDownloadTokenPost({
        fields: '*',
        db: queryOptions.schemas,
        digest: queryOptions.digest,
        text: queryOptions.searchText,
        plans: queryOptions.plans,
        orderBy: orderOptions.orderBy,
        desc: orderOptions.desc,
        end_time: queryTimeRange.endTime,
        begin_time: queryTimeRange.beginTime,
      })
      const token = res.data
      if (token) {
        window.location.href = `${client.getBasePath()}/slow_query/download?token=${token}`
      }
    } finally {
      setDownloading(false)
    }
  }

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
    visibleColumnKeys,

    downloading,
    downloadCSV,
  }
}
