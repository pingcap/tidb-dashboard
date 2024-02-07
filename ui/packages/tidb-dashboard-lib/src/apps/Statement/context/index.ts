import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  StatementEditableConfig,
  StatementGetStatementsRequest,
  StatementModel,
  StatementBinding
} from '@lib/client'

import { IContextConfig, ReqConfig } from '@lib/types'
import { ISlowQueryDataSource } from '@lib/apps/SlowQuery'

export type StatementTimeRange = {
  begin_time: number
  end_time: number
}

export interface IStatementDataSource extends ISlowQueryDataSource {
  statementsAvailableFieldsGet(options?: ReqConfig): AxiosPromise<Array<string>>

  statementsConfigGet(
    options?: ReqConfig
  ): AxiosPromise<StatementEditableConfig>

  statementsConfigPost(
    request: StatementEditableConfig,
    options?: ReqConfig
  ): AxiosPromise<string>

  statementsDownloadGet(token: string, options?: ReqConfig): AxiosPromise<void>

  statementsDownloadTokenPost(
    request: StatementGetStatementsRequest,
    options?: ReqConfig
  ): AxiosPromise<string>

  statementsListGet(
    beginTime?: number,
    endTime?: number,
    fields?: string,
    schemas?: Array<string>,
    resourceGroups?: Array<string>,
    stmtTypes?: Array<string>,
    text?: string,
    options?: ReqConfig
  ): AxiosPromise<Array<StatementModel>>

  statementsPlanDetailGet(
    beginTime?: number,
    digest?: string,
    endTime?: number,
    plans?: Array<string>,
    schemaName?: string,
    options?: ReqConfig
  ): AxiosPromise<StatementModel>

  statementsPlansGet(
    beginTime?: number,
    digest?: string,
    endTime?: number,
    schemaName?: string,
    options?: ReqConfig
  ): AxiosPromise<Array<StatementModel>>

  statementsStmtTypesGet(options?: ReqConfig): AxiosPromise<Array<string>>

  statementsTimeRangesGet(
    options?: ReqConfig
  ): AxiosPromise<Array<StatementTimeRange>>

  statementsPlanBindStatusGet?(
    sqlDigest: string,
    beginTime: number,
    endTime: number,
    options?: ReqConfig
  ): AxiosPromise<StatementBinding>

  statementsPlanBindCreate?(
    planDigest: string,
    options?: ReqConfig
  ): AxiosPromise<string>

  statementsPlanBindDelete?(
    sqlDigest: string,
    options?: ReqConfig
  ): AxiosPromise<string>
}

export interface IStatementConfig extends IContextConfig {
  enableExport?: boolean
  showConfig?: boolean // default is true
  showDBFilter?: boolean // default is true
  showResourceGroupFilter?: boolean // default is true
  showHelp?: boolean // default is true

  // control whether show statement actual time range
  // for example:
  // Due to time window and expiration configurations, currently displaying data in time range: Today at 1:00 PM (UTC+08:00) ~ Today at 3:30 PM (UTC+08:00)
  // for serverless, the statement window is 1 minutes, instead of 30 mins in OP
  // so for serverless, this message is unnecessary
  showActualTimeRange?: boolean

  enablePlanBinding?: boolean

  // true means start to search instantly after changing any filter options
  // false means only to start searching after clicking the "Query" button
  instantQuery?: boolean

  // to limit the time range picker range
  timeRangeSelector?: {
    recentSeconds: number[]
    customAbsoluteRangePicker: boolean
  }
}

export interface IStatementContext {
  ds: IStatementDataSource
  cfg: IStatementConfig
}

export const StatementContext = createContext<IStatementContext | null>(null)

export const StatementProvider = StatementContext.Provider
