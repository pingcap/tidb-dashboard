import { useMemo, useState } from 'react'
import { useMemoizedFn, useSessionStorageState } from 'ahooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import {
  TimeRange,
  IColumnKeys,
  DEFAULT_TIME_RANGE,
  toTimeRangeValue
} from '@lib/components'
import useOrderState, { IOrderOptions } from '@lib/utils/useOrderState'
import { getSelectedFields } from '@lib/utils/tableColumnFactory'
import { CacheMgr } from '@lib/utils/useCache'
import useCacheItemIndex from '@lib/utils/useCacheItemIndex'
import { derivedFields, slowQueryColumns } from './tableColumns'
import { useSchemaColumns } from './useSchemaColumns'
import { useChange } from '@lib/utils/useChange'
import { ISlowQueryDataSource } from '../context'
import { SlowqueryModel } from '@lib/client'

const SLOW_DATA_LOAD_THRESHOLD = 2000

export const DEF_SLOW_QUERY_COLUMN_KEYS: IColumnKeys = {
  query: true,
  timestamp: true,
  query_time: true,
  memory_max: true
}

const QUERY_OPTIONS = 'slow_query.query_options'

const DEF_ORDER_OPTIONS: IOrderOptions = {
  orderBy: 'timestamp',
  desc: true
}

interface RuntimeCacheEntity {
  data: SlowqueryModel[]
  isDataLoadedSlowly: boolean
}

export interface ISlowQueryOptions {
  visibleColumnKeys: IColumnKeys
  timeRange: TimeRange
  schemas: string[]
  groups: string[]
  searchText: string
  limit: number

  // below is for showing slow queries in the statement detail page
  digest: string
  plans: string[]
}

export const DEF_SLOW_QUERY_OPTIONS: ISlowQueryOptions = {
  visibleColumnKeys: DEF_SLOW_QUERY_COLUMN_KEYS,
  timeRange: DEFAULT_TIME_RANGE,
  schemas: [],
  searchText: '',
  limit: 100,

  digest: '',
  plans: [],
  groups: []
}

function useQueryOptions(
  initial?: ISlowQueryOptions,
  persistInSession: boolean = true
) {
  const [memoryQueryOptions, setMemoryQueryOptions] = useState(
    initial || DEF_SLOW_QUERY_OPTIONS
  )
  const [sessionQueryOptions, setSessionQueryOptions] = useSessionStorageState(
    QUERY_OPTIONS,
    { defaultValue: initial || DEF_SLOW_QUERY_OPTIONS }
  )
  const queryOptions = persistInSession
    ? sessionQueryOptions
    : memoryQueryOptions
  const setQueryOptions = useMemoizedFn(
    (value: React.SetStateAction<ISlowQueryOptions>) => {
      if (persistInSession) {
        setSessionQueryOptions(value as any)
      } else {
        setMemoryQueryOptions(value)
      }
    }
  )
  return {
    queryOptions,
    setQueryOptions
  }
}

export interface ISlowQueryTableControllerOpts {
  cacheMgr?: CacheMgr
  showFullSQL?: boolean
  fetchSchemas?: boolean
  initialQueryOptions?: ISlowQueryOptions
  persistQueryInSession?: boolean
  filters?: Set<string>

  ds: ISlowQueryDataSource
}

export interface ISlowQueryTableController {
  queryOptions: ISlowQueryOptions
  setQueryOptions: (value: React.SetStateAction<ISlowQueryOptions>) => void // Updating query options will result in a refresh

  orderOptions: IOrderOptions
  changeOrder: (orderBy: string, desc: boolean) => void
  resetOrder: () => void

  isLoading: boolean

  data?: SlowqueryModel[]
  isDataLoadedSlowly: boolean | null // SLOW_DATA_LOAD_THRESHOLD. NULL = Unknown
  allSchemas: string[]
  allGroups: string[]
  errors: Error[]

  availableColumnsInTable: IColumn[] // returned from backend

  saveClickedItemIndex: (idx: number) => void
  getClickedItemIndex: () => number
}

export default function useSlowQueryTableController({
  cacheMgr,
  showFullSQL = false,
  fetchSchemas = true,
  initialQueryOptions,
  persistQueryInSession = true,
  ds,
  filters
}: ISlowQueryTableControllerOpts): ISlowQueryTableController {
  const { orderOptions, changeOrder } = useOrderState(
    'slow_query',
    persistQueryInSession,
    DEF_ORDER_OPTIONS
  )
  function resetOrder() {
    changeOrder(DEF_ORDER_OPTIONS.orderBy, DEF_ORDER_OPTIONS.desc)
  }

  const { queryOptions, setQueryOptions } = useQueryOptions(
    initialQueryOptions,
    persistQueryInSession
  )

  const [allSchemas, setAllSchemas] = useState<string[]>([])
  const [allGroups, setAllGroups] = useState<string[]>([])
  const [isOptionsLoading, setOptionsLoading] = useState(true)
  const [data, setData] = useState<SlowqueryModel[] | undefined>(undefined)
  const [isDataLoading, setDataLoading] = useState(false)
  const [isDataLoadedSlowly, setDataLoadedSlowly] = useState<boolean | null>(
    null
  )
  const [errors, setErrors] = useState<any[]>([])
  const { schemaColumns, isLoading: isColumnsLoading } = useSchemaColumns(
    ds.slowQueryAvailableFieldsGet
  )

  const filteredData = useMemo(() => {
    if (!filters) {
      return data
    }
    return data?.filter((d) => filters.has(d.digest!))
  }, [data, filters])

  // Reload these options when sending a new request.
  useChange(() => {
    async function querySchemas() {
      if (!fetchSchemas) {
        return
      }
      try {
        // this file will be removed later
        const res = await ds.getDatabaseList(0, 0, {
          handleError: 'custom'
        })
        setAllSchemas(res?.data || [])
      } catch (e) {
        setErrors((prev) => prev.concat(e as Error))
      }
    }

    async function queryGroups() {
      try {
        const res = await ds.infoListResourceGroupNames({
          handleError: 'custom'
        })
        setAllGroups(res?.data || [])
      } catch (e) {
        // setErrors((prev) => prev.concat(e as Error))
      }
    }

    async function doRequest() {
      setOptionsLoading(true)
      try {
        await Promise.all([
          querySchemas(),
          queryGroups()
          // Multiple query options can be added later
        ])
      } finally {
        setOptionsLoading(false)
      }
    }

    doRequest()
  }, [queryOptions])

  useChange(() => {
    async function getSlowQueryList() {
      // Try cache if options are unchanged.
      // Note: When clicking "Query" manually, cache will be cleared before reach here. So that it
      // will always send a request without looking up in the cache.

      // The cache key is built over queryOptions, instead of evaluated one.
      // So that when passing in same relative times options (e.g. Recent 15min)
      // the cache can be reused.
      const cacheKey = JSON.stringify({ queryOptions, orderOptions })
      {
        const cache = cacheMgr?.get(cacheKey)
        if (cache) {
          const cacheCloned = JSON.parse(
            JSON.stringify(cache)
          ) as RuntimeCacheEntity
          setData(cacheCloned.data)
          setDataLoadedSlowly(cacheCloned.isDataLoadedSlowly)
          setDataLoading(false)
          return
        }
      }

      // May be caused by visibleColumnKeys is empty (when available columns are not yet loaded)
      // In this case, we don't send any requests.
      const actualVisibleColumnKeys = getSelectedFields(
        queryOptions.visibleColumnKeys,
        derivedFields
      ).join(',')
      if (actualVisibleColumnKeys.length === 0) {
        return
      }

      const requestBeginAt = performance.now()
      setDataLoading(true)

      const timeRange = toTimeRangeValue(queryOptions.timeRange)

      try {
        const res = await ds.slowQueryListGet(
          timeRange[0],
          queryOptions.schemas,
          orderOptions.desc,
          queryOptions.digest,
          timeRange[1],
          actualVisibleColumnKeys,
          queryOptions.limit,
          orderOptions.orderBy,
          queryOptions.plans,
          queryOptions.groups,
          queryOptions.searchText,
          {
            handleError: 'custom'
          }
        )
        const data = res?.data || []
        setData(data)
        setErrors([])

        const elapsed = performance.now() - requestBeginAt
        const isLoadSlow = elapsed >= SLOW_DATA_LOAD_THRESHOLD
        setDataLoadedSlowly(isLoadSlow)

        const cacheEntity: RuntimeCacheEntity = {
          data,
          isDataLoadedSlowly: isLoadSlow
        }
        cacheMgr?.set(cacheKey, cacheEntity)
      } catch (e) {
        setData(undefined)
        setErrors((prev) => prev.concat(e))
      } finally {
        setDataLoading(false)
      }
    }

    getSlowQueryList()
  }, [queryOptions, orderOptions])

  const availableColumnsInTable = useMemo(
    () => slowQueryColumns(data ?? [], schemaColumns, showFullSQL),
    [data, schemaColumns, showFullSQL]
  )

  const { saveClickedItemIndex, getClickedItemIndex } =
    useCacheItemIndex(cacheMgr)

  return {
    queryOptions,
    setQueryOptions,

    orderOptions,
    changeOrder,
    resetOrder,

    isLoading: isColumnsLoading || isDataLoading || isOptionsLoading,

    data: filteredData,
    isDataLoadedSlowly,
    allSchemas,
    allGroups,
    errors,

    availableColumnsInTable,

    saveClickedItemIndex,
    getClickedItemIndex
  }
}
