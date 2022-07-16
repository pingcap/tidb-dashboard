import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { QueryeditorRunRequest, QueryeditorRunResponse } from '@lib/client'

import { ReqConfig } from '@lib/types'

export interface IQueryEditorDataSource {
  queryEditorRun(
    request: QueryeditorRunRequest,
    options?: ReqConfig
  ): AxiosPromise<QueryeditorRunResponse>
}

export interface IQueryEditorContext {
  ds: IQueryEditorDataSource
}

export const QueryEditorContext = createContext<IQueryEditorContext | null>(
  null
)

export const QueryEditorProvider = QueryEditorContext.Provider
