import { useState, useEffect, useMemo } from 'react'
import { useSessionStorageState } from '@umijs/hooks'
import client, { StatementTimeRange, StatementModel } from '@lib/client'
import {
  TimeRange,
  DEF_TIME_RANGE,
  calcValidStatementTimeRange,
} from '../pages/List/TimeRangeSelector'

const QUERY_OPTIONS = 'statement.query_options'

export interface IStatementQueryOptions {
  timeRange: TimeRange
  schemas: string[]
  stmtTypes: string[]
  orderBy: string
  desc: boolean
}

export const DEF_STMT_QUERY_OPTIONS: IStatementQueryOptions = {
  timeRange: DEF_TIME_RANGE,
  schemas: [],
  stmtTypes: [],
  orderBy: 'sum_latency',
  desc: true,
}

export default function useStatement(
  options?: IStatementQueryOptions,
  needSave: boolean = true
) {
  const [queryOptions, setQueryOptions] = useState(
    options || DEF_STMT_QUERY_OPTIONS
  )
  const [savedQueryOptions, setSavedQueryOptions] = useSessionStorageState(
    QUERY_OPTIONS,
    options || DEF_STMT_QUERY_OPTIONS
  )

  const [enable, setEnable] = useState(true)
  const [allTimeRanges, setAllTimeRanges] = useState<StatementTimeRange[]>([])
  const [allSchemas, setAllSchemas] = useState<string[]>([])
  const [allStmtTypes, setAllStmtTypes] = useState<string[]>([])

  const validTimeRange = useMemo(() => {
    let curOptions = needSave ? savedQueryOptions : queryOptions
    return calcValidStatementTimeRange(curOptions.timeRange, allTimeRanges)
  }, [needSave, queryOptions, savedQueryOptions, allTimeRanges])

  const [loadingStatements, setLoadingStatements] = useState(true)
  const [statements, setStatements] = useState<StatementModel[]>([])

  const [refreshTimes, setRefreshTimes] = useState(0)

  function refresh() {
    setRefreshTimes((prev) => prev + 1)
  }

  useEffect(() => {
    async function queryStatementStatus() {
      const res = await client.getInstance().statementsConfigGet()
      setEnable(res?.data.enable!)
    }

    async function querySchemas() {
      const res = await client.getInstance().statementsSchemasGet()
      setAllSchemas(res?.data || [])
    }

    async function queryTimeRanges() {
      const res = await client.getInstance().statementsTimeRangesGet()
      setAllTimeRanges(res?.data || [])
    }

    async function queryStmtTypes() {
      const res = await client.getInstance().statementsStmtTypesGet()
      setAllStmtTypes(res?.data || [])
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
        return
      }
      let curOptions = needSave ? savedQueryOptions : queryOptions
      setLoadingStatements(true)
      const res = await client
        .getInstance()
        .statementsOverviewsGet(
          validTimeRange.begin_time!,
          validTimeRange.end_time!,
          curOptions.schemas,
          curOptions.stmtTypes
        )
      setLoadingStatements(false)
      setStatements(res?.data || [])
    }

    queryStatementList()
  }, [
    needSave,
    queryOptions,
    savedQueryOptions,
    allTimeRanges,
    validTimeRange,
    refreshTimes,
  ])

  return {
    queryOptions,
    setQueryOptions,
    savedQueryOptions,
    setSavedQueryOptions,
    enable,
    allTimeRanges,
    allSchemas,
    allStmtTypes,
    validTimeRange,
    loadingStatements,
    statements,
    refresh,
  }
}
