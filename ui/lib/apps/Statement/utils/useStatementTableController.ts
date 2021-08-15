import { useEffect, useMemo, useState } from 'react'
import { useSessionStorageState } from 'ahooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'

import client, {
  ErrorStrategy,
  StatementModel,
  StatementTimeRange,
} from '@lib/client'
import { IColumnKeys, stringifyTimeRange } from '@lib/components'
import { getSelectedFields } from '@lib/utils/tableColumnFactory'
import { CacheMgr } from '@lib/utils/useCache'
import useOrderState, { IOrderOptions } from '@lib/utils/useOrderState'
import useCacheItemIndex from '@lib/utils/useCacheItemIndex'

import {
  calcValidStatementTimeRange,
  DEFAULT_TIME_RANGE,
  TimeRange,
} from '../pages/List/TimeRangeSelector'
import { derivedFields, statementColumns } from './tableColumns'
import { useSchemaColumns } from './useSchemaColumns'
import { useStatements } from './useStatements'

export const DEF_STMT_COLUMN_KEYS: IColumnKeys = {
  digest_text: true,
  sum_latency: true,
  avg_latency: true,
  exec_count: true,
  plan_count: true,
  related_schemas: true,
}

const QUERY_OPTIONS = 'statement.query_options'

const DEF_ORDER_OPTIONS: IOrderOptions = {
  orderBy: 'sum_latency',
  desc: true,
}

export interface IStatementQueryOptions {
  timeRange: TimeRange
  schemas: string[]
  stmtTypes: string[]
  searchText: string
}

export const DEF_STMT_QUERY_OPTIONS: IStatementQueryOptions = {
  timeRange: DEFAULT_TIME_RANGE,
  schemas: [],
  stmtTypes: [],
  searchText: '',
}

export interface IStatementTableController {
  queryOptions: IStatementQueryOptions
  setQueryOptions: (options: IStatementQueryOptions) => void
  orderOptions: IOrderOptions
  changeOrder: (orderBy: string, desc: boolean) => void
  refresh: () => void

  enable: boolean
  allTimeRanges: StatementTimeRange[]
  allSchemas: string[]
  allStmtTypes: string[]
  statementsTimeRange: StatementTimeRange
  loadingStatements: boolean
  statements: StatementModel[]

  errors: Error[]

  tableColumns: IColumn[]
  visibleColumnKeys: IColumnKeys

  downloadCSV: () => Promise<void>
  downloading: boolean

  saveClickedItemIndex: (idx: number) => void
  getClickedItemIndex: () => number
}

export default function useStatementTableController(
  cacheMgr: CacheMgr | null,
  visibleColumnKeys: IColumnKeys,
  showFullSQL: boolean,
  options?: IStatementQueryOptions,
  needSave: boolean = true
): IStatementTableController {
  const { orderOptions, changeOrder } = useOrderState(
    'statement',
    needSave,
    DEF_ORDER_OPTIONS
  )

  const [memoryQueryOptions, setMemoryQueryOptions] = useState(
    options || DEF_STMT_QUERY_OPTIONS
  )
  const [sessionQueryOptions, setSessionQueryOptions] = useSessionStorageState(
    QUERY_OPTIONS,
    options || DEF_STMT_QUERY_OPTIONS
  )
  const queryOptions = useMemo(
    () => (needSave ? sessionQueryOptions : memoryQueryOptions),
    [needSave, memoryQueryOptions, sessionQueryOptions]
  )

  const [enable, setEnable] = useState(true)
  const [allTimeRanges, setAllTimeRanges] = useState<StatementTimeRange[]>([])
  const [allSchemas, setAllSchemas] = useState<string[]>([])
  const [allStmtTypes, setAllStmtTypes] = useState<string[]>([])

  const validTimeRange = useMemo(
    () => calcValidStatementTimeRange(queryOptions.timeRange, allTimeRanges),
    [queryOptions, allTimeRanges]
  )

  const [loading, setLoading] = useState(true)

  const [refreshTimes, setRefreshTimes] = useState(0)

  function setQueryOptions(newOptions: IStatementQueryOptions) {
    if (needSave) {
      setSessionQueryOptions(newOptions)
    } else {
      setMemoryQueryOptions(newOptions)
    }
  }

  const [errors, setErrors] = useState<any[]>([])

  useEffect(() => {
    errors.length && setLoading(false)
  }, [errors])

  const selectedFields = useMemo(
    () => getSelectedFields(visibleColumnKeys, derivedFields).join(','),
    [visibleColumnKeys]
  )

  const cacheKey = useMemo(() => {
    const { schemas, stmtTypes, searchText, timeRange } = queryOptions
    const cacheKey = `${schemas.join(',')}_${stmtTypes.join(
      ','
    )}_${searchText}_${stringifyTimeRange(timeRange)}_${selectedFields}`
    return cacheKey
  }, [queryOptions, selectedFields])

  function refresh() {
    cacheMgr?.remove(cacheKey)

    setErrors([])
    setLoading(true)
    setRefreshTimes((prev) => prev + 1)
  }

  useEffect(() => {
    async function queryStatementStatus() {
      try {
        const res = await client.getInstance().statementsConfigGet({
          errorStrategy: ErrorStrategy.Custom,
        })
        setEnable(res?.data.enable!)
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

    async function queryTimeRanges() {
      try {
        const res = await client.getInstance().statementsTimeRangesGet({
          errorStrategy: ErrorStrategy.Custom,
        })
        setAllTimeRanges(res?.data || [])
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

    queryStatementStatus()
    querySchemas()
    queryTimeRanges()
    queryStmtTypes()
  }, [refreshTimes])

  const {
    statements,
    setStatements,
    statementsTimeRange,
    queryStatements,
  } = useStatements(cacheKey)
  const { schemaColumns, isLoading: isSchemaLoading } = useSchemaColumns()
  const tableColumns = useMemo(
    () => statementColumns(statements, schemaColumns, showFullSQL),
    [statements, schemaColumns, showFullSQL]
  )

  useEffect(() => {
    async function queryStatementList() {
      if (
        !selectedFields.length ||
        isSchemaLoading ||
        allTimeRanges.length === 0
      ) {
        setStatements([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        await queryStatements(
          validTimeRange.begin_time!,
          validTimeRange.end_time!,
          selectedFields,
          queryOptions.schemas,
          queryOptions.stmtTypes,
          queryOptions.searchText,
          {
            errorStrategy: ErrorStrategy.Custom,
          }
        )
      } catch (e) {
        setErrors((prev) => prev.concat(e))
      } finally {
        setLoading(false)
      }
    }

    queryStatementList()
    // eslint-disable-next-line
  }, [
    queryOptions,
    allTimeRanges,
    validTimeRange,
    selectedFields,
    cacheKey,
    isSchemaLoading,
  ])

  const [downloading, setDownloading] = useState(false)

  async function downloadCSV() {
    try {
      setDownloading(true)
      const res = await client.getInstance().statementsDownloadTokenPost({
        begin_time: validTimeRange.begin_time,
        end_time: validTimeRange.end_time,
        fields: '*',
        schemas: queryOptions.schemas,
        stmt_types: queryOptions.stmtTypes,
        text: queryOptions.searchText,
      })
      const token = res.data
      if (token) {
        window.location.href = `${client.getBasePath()}/statements/download?token=${token}`
      }
    } finally {
      setDownloading(false)
    }
  }

  const { saveClickedItemIndex, getClickedItemIndex } = useCacheItemIndex(
    cacheMgr
  )

  return {
    queryOptions,
    setQueryOptions,
    orderOptions,
    changeOrder,
    refresh,

    enable,
    allTimeRanges,
    allSchemas,
    allStmtTypes,
    statementsTimeRange,
    loadingStatements: loading,
    statements,

    errors,

    tableColumns,
    visibleColumnKeys,

    downloadCSV,
    downloading,

    saveClickedItemIndex,
    getClickedItemIndex,
  }
}
