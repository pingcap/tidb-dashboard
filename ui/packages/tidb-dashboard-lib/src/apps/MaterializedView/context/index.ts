import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { IContextConfig, ReqConfig } from '@lib/types'

export interface IMaterializedViewRefreshHistoryItem {
  refresh_job_id?: string
  schema?: string
  materialized_view?: string
  refresh_time?: string
  duration?: number | null
  refresh_status?: 'success' | 'failed' | 'running' | string
  refresh_rows?: number
  refresh_read_tso?: string
  failed_reason?: string | null
}

export interface IMaterializedViewRefreshHistoryRequest {
  begin_time: number
  end_time: number
  schema: string
  materialized_view?: string
  status?: string[]
  min_duration?: number
  page?: number
  page_size?: number
  orderBy?: 'refresh_time' | 'refresh_duration_sec'
  desc?: boolean
}

export interface IMaterializedViewRefreshHistoryResponse {
  items?: IMaterializedViewRefreshHistoryItem[]
  total?: number
}

export interface IMaterializedViewDataSource {
  materializedViewRefreshHistoryGet(
    request: IMaterializedViewRefreshHistoryRequest,
    options?: ReqConfig
  ): AxiosPromise<IMaterializedViewRefreshHistoryResponse>
  materializedViewRefreshHistoryDetailGet(
    id: string,
    options?: ReqConfig
  ): AxiosPromise<IMaterializedViewRefreshHistoryItem>
}

export interface IMaterializedViewConfig extends IContextConfig {}

export interface IMaterializedViewContext {
  ds: IMaterializedViewDataSource
  cfg: IMaterializedViewConfig
}

export const MaterializedViewContext =
  createContext<IMaterializedViewContext | null>(null)

export const MaterializedViewProvider = MaterializedViewContext.Provider
