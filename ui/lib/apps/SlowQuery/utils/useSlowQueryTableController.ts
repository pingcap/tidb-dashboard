import { useEffect, useMemo, useState } from 'react'
import { useSessionStorageState } from 'ahooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'

import client, { ErrorStrategy, SlowqueryModel } from '@lib/client'
import {
  calcTimeRange,
  TimeRange,
  IColumnKeys,
  stringifyTimeRange,
} from '@lib/components'
import useOrderState, { IOrderOptions } from '@lib/utils/useOrderState'

import { getSelectedFields } from '@lib/utils/tableColumnFactory'
import { CacheMgr } from '@lib/utils/useCache'
import useCacheItemIndex from '@lib/utils/useCacheItemIndex'

import { derivedFields, slowQueryColumns } from './tableColumns'
import { useSchemaColumns } from './useSchemaColumns'

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
  slowQueries: SlowqueryModel[]
  queryTimeRange: { beginTime: number; endTime: number }

  errors: Error[]

  tableColumns: IColumn[]
  visibleColumnKeys: IColumnKeys

  downloadCSV: () => Promise<void>
  downloading: boolean

  saveClickedItemIndex: (idx: number) => void
  getClickedItemIndex: () => number
}

export default function useSlowQueryTableController(
  cacheMgr: CacheMgr | null,
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

  const [allSchemas, setAllSchemas] = useState<string[]>([])
  const [loadingSlowQueries, setLoadingSlowQueries] = useState(false)
  const [slowQueries, setSlowQueries] = useState<SlowqueryModel[]>([])
  const [refreshTimes, setRefreshTimes] = useState(0)

  const queryTimeRange = useMemo(() => {
    const [beginTime, endTime] = calcTimeRange(queryOptions.timeRange)
    return { beginTime, endTime }
  }, [queryOptions, refreshTimes])

  function setQueryOptions(newOptions: ISlowQueryOptions) {
    if (needSave) {
      setSessionQueryOptions(newOptions)
    } else {
      setMemoryQueryOptions(newOptions)
    }
  }

  const [errors, setErrors] = useState<Error[]>([])

  const selectedFields = useMemo(
    () => getSelectedFields(visibleColumnKeys, derivedFields).join(','),
    [visibleColumnKeys]
  )

  const cacheKey = useMemo(() => {
    const { schemas, digest, limit, plans, searchText, timeRange } =
      queryOptions
    const { desc, orderBy } = orderOptions
    const cacheKey = `${schemas.join(',')}_${digest}_${limit}_${plans.join(
      ','
    )}_${searchText}_${stringifyTimeRange(
      timeRange
    )}_${desc}_${orderBy}_${selectedFields}`
    return cacheKey
  }, [queryOptions, orderOptions, selectedFields])

  function refresh() {
    cacheMgr?.remove(cacheKey)

    setErrors([])
    setRefreshTimes((prev) => prev + 1)
  }

  useEffect(() => {
    async function querySchemas() {
      try {
        const res = await client.getInstance().infoListDatabases({
          errorStrategy: ErrorStrategy.Custom,
        })
        setAllSchemas(res?.data || [])
      } catch (e) {
        setErrors((prev) => prev.concat(e as Error))
      }
    }

    querySchemas()
  }, [])

  const { schemaColumns, isLoading: isSchemaLoading } = useSchemaColumns()

  const tableColumns = useMemo(
    () => slowQueryColumns(slowQueries, schemaColumns, showFullSQL),
    [slowQueries, schemaColumns, showFullSQL]
  )

  useEffect(() => {
    if (!selectedFields.length) {
      setSlowQueries([])
      setLoadingSlowQueries(false)
      return
    }

    async function getSlowQueryList() {
      const cacheItem = cacheMgr?.get(cacheKey)
      if (cacheItem) {
        setSlowQueries(cacheItem)
        return
      }

      setLoadingSlowQueries(true)
      try {
        const res = await client
          .getInstance()
          .slowQueryListGet(
            queryTimeRange.beginTime,
            queryOptions.schemas,
            orderOptions.desc,
            queryOptions.digest,
            queryTimeRange.endTime,
            selectedFields,
            queryOptions.limit,
            orderOptions.orderBy,
            queryOptions.plans,
            queryOptions.searchText,
            {
              errorStrategy: ErrorStrategy.Custom,
            }
          )
        setSlowQueries(res.data || [])
        cacheMgr?.set(cacheKey, res.data || [])
        setErrors([])
      } catch (e) {
        setErrors((prev) => prev.concat(e as Error))
      }
      setLoadingSlowQueries(false)
    }

    if (isSchemaLoading) {
      return
    }
    getSlowQueryList()
  }, [
    queryOptions,
    orderOptions,
    queryTimeRange,
    selectedFields,
    refreshTimes,
    cacheKey,
    cacheMgr,
    isSchemaLoading,
  ])

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

  const { saveClickedItemIndex, getClickedItemIndex } =
    useCacheItemIndex(cacheMgr)

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

    saveClickedItemIndex,
    getClickedItemIndex,
  }
}
