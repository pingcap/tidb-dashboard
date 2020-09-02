import { useEffect, useMemo, useState } from 'react'
import { useSessionStorageState } from '@umijs/hooks'

import client, { StatementModel, StatementTimeRange } from '@lib/client'
import useOrderState, { IOrderOptions } from '@lib/utils/useOrderState'

import {
  calcValidStatementTimeRange,
  DEFAULT_TIME_RANGE,
  TimeRange,
} from '../pages/List/TimeRangeSelector'
import { IColumnKeys } from '@lib/components'
import { STMT_COLUMN_REFS } from './tableColumns'

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

export default function useStatement(
  visibleColumnKeys: IColumnKeys,
  options?: IStatementQueryOptions,
  needSave: boolean = true
) {
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

  const [loadingStatements, setLoadingStatements] = useState(true)
  const [statements, setStatements] = useState<StatementModel[]>([])

  const [refreshTimes, setRefreshTimes] = useState(0)

  function setQueryOptions(newOptions: IStatementQueryOptions) {
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
    async function queryStatementStatus() {
      try {
        const res = await client.getInstance().statementsConfigGet()
        setEnable(res?.data.enable!)
      } catch (error) {
        setErrors((prev) => [...prev, { ...error }])
      }
    }

    async function querySchemas() {
      try {
        const res = await client.getInstance().infoListDatabases()
        setAllSchemas(res?.data || [])
      } catch (error) {
        setErrors((prev) => [...prev, { ...error }])
      }
    }

    async function queryTimeRanges() {
      try {
        const res = await client.getInstance().statementsTimeRangesGet()
        setAllTimeRanges(res?.data || [])
      } catch (error) {
        setErrors((prev) => [...prev, { ...error }])
      }
    }

    async function queryStmtTypes() {
      try {
        const res = await client.getInstance().statementsStmtTypesGet()
        setAllStmtTypes(res?.data || [])
      } catch (error) {
        setErrors((prev) => [...prev, { ...error }])
      }
    }

    queryStatementStatus()
    querySchemas()
    queryTimeRanges()
    queryStmtTypes()
  }, [refreshTimes])

  useEffect(() => {
    async function queryStatementList() {
      if (allTimeRanges.length === 0) {
        setStatements([])
        setLoadingStatements(false)
        return
      }

      let fields: string[] = []
      Object.keys(visibleColumnKeys).forEach((k) => {
        if (visibleColumnKeys[k] === true) {
          const refFields = STMT_COLUMN_REFS[k]
          if (refFields !== undefined) {
            fields = fields.concat(refFields)
          } else {
            fields.push(k)
          }
        }
      })

      setLoadingStatements(true)
      try {
        const res = await client
          .getInstance()
          .statementsOverviewsGet(
            validTimeRange.begin_time!,
            validTimeRange.end_time!,
            fields.join(','),
            queryOptions.schemas,
            queryOptions.stmtTypes,
            queryOptions.searchText
          )
        setStatements(res?.data || [])
        setErrors([])
      } catch (error) {
        setErrors((prev) => [...prev, { ...error }])
      }
      setLoadingStatements(false)
    }

    queryStatementList()
  }, [queryOptions, allTimeRanges, validTimeRange, visibleColumnKeys])

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
    validTimeRange,
    loadingStatements,
    statements,

    errors,
  }
}
