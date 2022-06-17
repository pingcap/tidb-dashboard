import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  StatementEditableConfig,
  StatementGetStatementsRequest,
  StatementModel
} from '@lib/client'

import { ReqConfig } from '@lib/utils'
import { ISlowQueryDataSource } from '@lib/apps/SlowQuery'

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
}

export interface IStatementConfig {
  basePath: string
}

export interface IStatementContext {
  ds: IStatementDataSource
  config: IStatementConfig
}

export const StatementContext = createContext<IStatementContext | null>(null)

export const StatementProvider = StatementContext.Provider
