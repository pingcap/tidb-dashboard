import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { QueryeditorRunRequest, QueryeditorRunResponse } from '@lib/client'

import { ReqConfig } from '@lib/types'

export interface IOptimizerTraceDataSource {
  queryEditorRun(
    request: QueryeditorRunRequest,
    options?: ReqConfig
  ): AxiosPromise<QueryeditorRunResponse>
}

export interface IOptimizerTraceContext {
  ds: IOptimizerTraceDataSource
}

export const OptimizerTraceContext =
  createContext<IOptimizerTraceContext | null>(null)

export const OptimizerTraceProvider = OptimizerTraceContext.Provider
