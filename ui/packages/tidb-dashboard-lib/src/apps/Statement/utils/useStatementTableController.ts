import React, { useEffect, useMemo, useState } from 'react'
import { useMemoizedFn, useSessionStorageState } from 'ahooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { StatementModel } from '@lib/client'
import {
  DEFAULT_TIME_RANGE,
  IColumnKeys,
  TimeRange,
  toTimeRangeValue
} from '@lib/components'
import { getSelectedFields } from '@lib/utils/tableColumnFactory'
import { CacheMgr } from '@lib/utils/useCache'
import useOrderState, { IOrderOptions } from '@lib/utils/useOrderState'
import useCacheItemIndex from '@lib/utils/useCacheItemIndex'
import { derivedFields, statementColumns } from './tableColumns'
import { useSchemaColumns } from './useSchemaColumns'
import { useChange } from '@lib/utils/useChange'
import { IStatementDataSource } from '../context'

const SLOW_DATA_LOAD_THRESHOLD = 2000

export const DEF_STMT_COLUMN_KEYS: IColumnKeys = {
  digest_text: true,
  sum_latency: true,
  avg_latency: true,
  exec_count: true,
  plan_count: true
}

const QUERY_OPTIONS = 'statement.query_options'

const DEF_ORDER_OPTIONS: IOrderOptions = {
  orderBy: 'sum_latency',
  desc: true
}

interface RuntimeCacheEntity {
  data: IStatementList
  isDataLoadedSlowly: boolean
}

export interface IStatementQueryOptions {
  visibleColumnKeys: IColumnKeys
  timeRange: TimeRange
  schemas: string[]
  groups: string[]
  stmtTypes: string[]
  searchText: string
}

export interface IStatementList {
  list: StatementModel[]
  timeRange: [number, number] // Useful for sending detail requests
}

export const DEF_STMT_QUERY_OPTIONS: IStatementQueryOptions = {
  visibleColumnKeys: DEF_STMT_COLUMN_KEYS,
  timeRange: DEFAULT_TIME_RANGE,
  schemas: [],
  groups: [],
  stmtTypes: [],
  searchText: ''
}

function useQueryOptions(
  initial?: IStatementQueryOptions,
  persistInSession: boolean = true
) {
  const [memoryQueryOptions, setMemoryQueryOptions] = useState(
    initial || DEF_STMT_QUERY_OPTIONS
  )
  const [sessionQueryOptions, setSessionQueryOptions] = useSessionStorageState(
    QUERY_OPTIONS,
    { defaultValue: initial || DEF_STMT_QUERY_OPTIONS }
  )
  const queryOptions = persistInSession
    ? sessionQueryOptions
    : memoryQueryOptions
  const setQueryOptions = useMemoizedFn(
    (value: React.SetStateAction<IStatementQueryOptions>) => {
      if (persistInSession) {
        // as any is a workaround for https://github.com/alibaba/hooks/issues/1582
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

export interface IStatementTableControllerOpts {
  cacheMgr?: CacheMgr
  showFullSQL?: boolean
  fetchSchemas?: boolean
  fetchGroups?: boolean
  fetchConfig?: boolean
  initialQueryOptions?: IStatementQueryOptions
  persistQueryInSession?: boolean

  ds: IStatementDataSource
}

export interface IStatementTableController {
  queryOptions: IStatementQueryOptions
  setQueryOptions: (value: React.SetStateAction<IStatementQueryOptions>) => void // Updating query options will result in a refresh

  orderOptions: IOrderOptions
  changeOrder: (orderBy: string, desc: boolean) => void
  resetOrder: () => void

  isEnabled: boolean // returned from backend
  isLoading: boolean

  data?: IStatementList
  isDataLoadedSlowly: boolean | null // SLOW_DATA_LOAD_THRESHOLD. NULL = Unknown
  allSchemas: string[]
  allGroups: string[]
  allStmtTypes: string[]
  errors: Error[]

  availableColumnsInTable: IColumn[] // returned from backend

  saveClickedItemIndex: (idx: number) => void
  getClickedItemIndex: () => number
}

export default function useStatementTableController({
  cacheMgr,
  showFullSQL = false,
  fetchSchemas = true,
  fetchGroups = true,
  fetchConfig = true,
  initialQueryOptions,
  persistQueryInSession = true,
  ds
}: IStatementTableControllerOpts): IStatementTableController {
  const { orderOptions, changeOrder } = useOrderState(
    'statement',
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

  const [isEnabled, setEnabled] = useState(true)
  const [allSchemas, setAllSchemas] = useState<string[]>([])
  const [allGroups, setAllGroups] = useState<string[]>([])
  const [allStmtTypes, setAllStmtTypes] = useState<string[]>([])
  const [isOptionsLoading, setOptionsLoading] = useState(true)
  const [data, setData] = useState<IStatementList | undefined>(undefined)
  const [isDataLoading, setDataLoading] = useState(true)
  const [isDataLoadedSlowly, setDataLoadedSlowly] = useState<boolean | null>(
    null
  )
  const [errors, setErrors] = useState<any[]>([])
  const { schemaColumns, isLoading: isColumnsLoading } = useSchemaColumns(
    ds.statementsAvailableFieldsGet
  )

  // By PR https://github.com/pingcap/tidb-dashboard/pull/1234 (feat: improve statement)
  // which brings in v2022.05.16.1 and PD >=5.4.2, >=6.1.0
  // The statement API logic changes a bit
  // related code: https://github.com/pingcap/tidb-dashboard/pull/1234/files#diff-4bebd6011f602ac611ee19697803dc09877df197bf0176d1f27f84133b15e68bR54
  // The new UI can't work with the old tidb-dashboard backend API well
  // So we try to make the new UI compatible with the old tidb-dashboard backend
  // By enlarging the selected time range with window size
  const [windowSize, setWindowSize] = useState(0)
  // assume the backend is old at first
  // then update it after the first request
  const [oldBackend, setOldBackend] = useState(true)

  // check old or new backend
  // the new backend removed the `/statements/time_ranges` API
  // so if get 404, then it's the new backend
  // else the old backend
  useEffect(() => {
    async function queryTimeRanges() {
      try {
        await ds.statementsTimeRangesGet({ handleError: 'custom' })
      } catch (e) {
        if ((e as any).response?.status === 404) {
          setOldBackend(false)
        }
      }
    }
    queryTimeRanges()
  }, [ds])

  // Reload these options when sending a new request.
  useChange(() => {
    async function queryStatementStatus() {
      if (!fetchConfig) {
        return
      }
      try {
        const res = await ds.statementsConfigGet({ handleError: 'custom' })
        setEnabled(res?.data.enable!)
        setWindowSize(res?.data?.refresh_interval ?? 0)
      } catch (e) {
        setErrors((prev) => prev.concat(e))
      }
    }

    async function querySchemas() {
      if (!fetchSchemas) {
        return
      }
      try {
        const res = await ds.getDatabaseList(0, 0, { handleError: 'custom' })
        setAllSchemas(res?.data || [])
      } catch (e) {
        setErrors((prev) => prev.concat(e))
      }
    }

    async function queryGroups() {
      if (!fetchGroups) {
        return
      }
      try {
        const res = await ds.infoListResourceGroupNames({
          handleError: 'custom'
        })
        setAllGroups(res?.data || [])
      } catch (e) {
        setErrors((prev) => prev.concat(e as Error))
      }
    }

    async function queryStmtTypes() {
      try {
        const res = await ds.statementsStmtTypesGet({ handleError: 'custom' })
        const stmtTypes = (res?.data || []).sort()
        setAllStmtTypes(stmtTypes)
      } catch (e) {
        setErrors((prev) => prev.concat(e))
      }
    }

    async function doRequest() {
      setOptionsLoading(true)
      try {
        await Promise.all([
          queryStatementStatus(),
          querySchemas(),
          queryGroups(),
          queryStmtTypes()
        ])
      } finally {
        setOptionsLoading(false)
      }
    }

    doRequest()
  }, [queryOptions])

  useChange(() => {
    async function queryStatementList() {
      // Try cache if options are unchanged.
      // Note: When clicking "Query" manually, cache will be cleared before reach here. So that it
      // will always send a request without looking up in the cache.

      // The cache key is built over queryOptions, instead of evaluated one.
      // So that when passing in same relative times options (e.g. Recent 15min)
      // the cache can be reused.
      const cacheKey = JSON.stringify(queryOptions)
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
      // enlarge the time range automatically for old tidb-dashboard backend
      if (oldBackend) {
        timeRange[0] -= windowSize
        timeRange[1] += windowSize
      }

      try {
        console.log('queryOptions', queryOptions)
        const res = await ds.statementsListGet(
          timeRange[0],
          timeRange[1],
          actualVisibleColumnKeys,
          queryOptions.schemas,
          queryOptions.groups,
          queryOptions.stmtTypes,
          queryOptions.searchText,
          { handleError: 'custom' }
        )
        const data = {
          list: res?.data || [],
          timeRange
        }
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

    queryStatementList()
  }, [queryOptions, windowSize, oldBackend])

  const availableColumnsInTable = useMemo(
    () => statementColumns(data?.list ?? [], schemaColumns, showFullSQL),
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

    isEnabled,
    isLoading: isColumnsLoading || isDataLoading || isOptionsLoading,

    data,
    isDataLoadedSlowly,
    allSchemas,
    allGroups,
    allStmtTypes,
    errors,

    availableColumnsInTable,

    saveClickedItemIndex,
    getClickedItemIndex
  }
}
