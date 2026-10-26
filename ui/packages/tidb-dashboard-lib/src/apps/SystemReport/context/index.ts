import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  DiagnoseReport,
  DiagnoseGenerateReportRequest,
  DiagnoseGenerateMetricsRelationRequest
} from '@lib/client'

import { IContextConfig, ReqConfig } from '@lib/types'

export interface ISystemReportDataSource {
  diagnoseReportsGet(options?: ReqConfig): AxiosPromise<Array<DiagnoseReport>>

  diagnoseReportsPost(
    request: DiagnoseGenerateReportRequest,
    options?: ReqConfig
  ): AxiosPromise<number>

  diagnoseGenerateMetricsRelationship(
    request: DiagnoseGenerateMetricsRelationRequest,
    options?: ReqConfig
  ): AxiosPromise<string>

  diagnoseReportsIdStatusGet(
    id: string,
    options?: ReqConfig
  ): AxiosPromise<DiagnoseReport>

  diagnoseReportsIdActionTokenGet(
    id: string,
    options?: ReqConfig
  ): AxiosPromise<string>
}

export interface ISystemReportConfig extends IContextConfig {
  publicPathBase: string

  fullReportLink(reportId: string, reportToken: string): string
}

export interface ISystemReportContext {
  ds: ISystemReportDataSource
  cfg: ISystemReportConfig
}

export const SystemReportContext = createContext<ISystemReportContext | null>(
  null
)

export const SystemReportProvider = SystemReportContext.Provider
