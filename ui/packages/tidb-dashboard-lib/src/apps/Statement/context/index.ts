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

export interface IStatementContext {
  ds: IStatementDataSource
  cfg: IContextConfig & {
    enableExport: boolean
    showHelp?: boolean
    enablePlanBinding?: boolean
  }
}

export const StatementContext = createContext<IStatementContext | null>(null)

export const StatementProvider = StatementContext.Provider
