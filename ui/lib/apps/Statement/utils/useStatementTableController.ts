import React, { useMemo, useState } from 'react'
import { useMemoizedFn, useSessionStorageState } from 'ahooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import client, { ErrorStrategy, StatementModel } from '@lib/client'
import {
  DEFAULT_TIME_RANGE,
  IColumnKeys,
  TimeRange,
  toTimeRangeValue,
} from '@lib/components'
import { getSelectedFields } from '@lib/utils/tableColumnFactory'
import { CacheMgr } from '@lib/utils/useCache'
import useOrderState, { IOrderOptions } from '@lib/utils/useOrderState'
import useCacheItemIndex from '@lib/utils/useCacheItemIndex'
import { derivedFields, statementColumns } from './tableColumns'
import { useSchemaColumns } from './useSchemaColumns'
import { useChange } from '@lib/utils/useChange'

const SLOW_DATA_LOAD_THRESHOLD = 2000

export const DEF_STMT_COLUMN_KEYS: IColumnKeys = {
  digest_text: true,
  sum_latency: true,
  avg_latency: true,
  exec_count: true,
  plan_count: true,
}

const QUERY_OPTIONS = 'statement.query_options'

const DEF_ORDER_OPTIONS: IOrderOptions = {
  orderBy: 'sum_latency',
  desc: true,
}

interface RuntimeCacheEntity {
  data: IStatementList
  isDataLoadedSlowly: boolean
}

export interface IStatementQueryOptions {
  visibleColumnKeys: IColumnKeys
  timeRange: TimeRange
  schemas: string[]
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
  stmtTypes: [],
  searchText: '',
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
    setQueryOptions,
  }
}

export interface IStatementTableControllerOpts {
  cacheMgr?: CacheMgr
  showFullSQL?: boolean
  initialQueryOptions?: IStatementQueryOptions
  persistQueryInSession?: boolean
}

export interface IStatementTableController {
  queryOptions: IStatementQueryOptions
  setQueryOptions: (value: React.SetStateAction<IStatementQueryOptions>) => void // Updating query options will result in a refresh

  orderOptions: IOrderOptions
  changeOrder: (orderBy: string, desc: boolean) => void

  isEnabled: boolean // returned from backend
  isLoading: boolean

  data?: IStatementList
  isDataLoadedSlowly: boolean | null // SLOW_DATA_LOAD_THRESHOLD. NULL = Unknown
  allSchemas: string[]
  allStmtTypes: string[]
  errors: Error[]

  availableColumnsInTable: IColumn[] // returned from backend

  saveClickedItemIndex: (idx: number) => void
  getClickedItemIndex: () => number
}

export default function useStatementTableController({
  cacheMgr,
  showFullSQL = false,
  initialQueryOptions,
  persistQueryInSession = true,
}: IStatementTableControllerOpts): IStatementTableController {
  const { orderOptions, changeOrder } = useOrderState(
    'statement',
    persistQueryInSession,
    DEF_ORDER_OPTIONS
  )

  const { queryOptions, setQueryOptions } = useQueryOptions(
    initialQueryOptions,
    persistQueryInSession
  )

  const [isEnabled, setEnabled] = useState(true)
  const [allSchemas, setAllSchemas] = useState<string[]>([])
  const [allStmtTypes, setAllStmtTypes] = useState<string[]>([])
  const [isOptionsLoading, setOptionsLoading] = useState(true)
  const [data, setData] = useState<IStatementList | undefined>(undefined)
  const [isDataLoading, setDataLoading] = useState(true)
  const [isDataLoadedSlowly, setDataLoadedSlowly] = useState<boolean | null>(
    null
  )
  const [errors, setErrors] = useState<any[]>([])
  const { schemaColumns, isLoading: isColumnsLoading } = useSchemaColumns()

  // Reload these options when sending a new request.
  useChange(() => {
    async function queryStatementStatus() {
      try {
        const res = await client.getInstance().statementsConfigGet({
          errorStrategy: ErrorStrategy.Custom,
        })
        setEnabled(res?.data.enable!)
      } catch (e) {
        setErrors((prev) => prev.concat(e))
      }
    }

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

    async function queryStmtTypes() {
      try {
        const res = await client.getInstance().statementsStmtTypesGet({
          errorStrategy: ErrorStrategy.Custom,
        })
        setAllStmtTypes(res?.data || [])
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
          queryStmtTypes(),
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

      try {
        const res = await client
          .getInstance()
          .statementsListGet(
            timeRange[0],
            timeRange[1],
            actualVisibleColumnKeys,
            queryOptions.schemas,
            queryOptions.stmtTypes,
            queryOptions.searchText,
            {
              errorStrategy: ErrorStrategy.Custom,
            }
          )
        const data = {
          list: res?.data || [],
          timeRange,
        }
        setData(data)

        const elapsed = performance.now() - requestBeginAt
        const isLoadSlow = elapsed >= SLOW_DATA_LOAD_THRESHOLD
        setDataLoadedSlowly(isLoadSlow)

        const cacheEntity: RuntimeCacheEntity = {
          data,
          isDataLoadedSlowly: isLoadSlow,
        }
        cacheMgr?.set(cacheKey, cacheEntity)
      } catch (e) {
        setErrors((prev) => prev.concat(e))
      } finally {
        setDataLoading(false)
      }
    }

    queryStatementList()
  }, [queryOptions])

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

    isEnabled,
    isLoading: isColumnsLoading || isDataLoading || isOptionsLoading,

    data,
    isDataLoadedSlowly,
    allSchemas,
    allStmtTypes,
    errors,

    availableColumnsInTable,

    saveClickedItemIndex,
    getClickedItemIndex,
  }
}
