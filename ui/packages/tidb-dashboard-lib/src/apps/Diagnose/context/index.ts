import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  DiagnoseGenDiagnosisReportRequest,
  DiagnoseTableDef
} from '@lib/client'

import { ReqConfig } from '@lib/types'

export interface IDiagnoseDataSource {
  diagnoseDiagnosisPost(
    request: DiagnoseGenDiagnosisReportRequest,
    options?: ReqConfig
  ): AxiosPromise<DiagnoseTableDef>
}

export interface IDiagnoseContext {
  ds: IDiagnoseDataSource
}

export const DiagnoseContext = createContext<IDiagnoseContext | null>(null)

export const DiagnoseProvider = DiagnoseContext.Provider
