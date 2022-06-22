import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  LogsearchCreateTaskGroupRequest,
  LogsearchTaskGroupResponse,
  LogsearchTaskGroupModel,
  LogsearchPreviewModel,
  TopologyTiDBInfo,
  ClusterinfoStoreTopologyResponse,
  TopologyPDInfo
} from '@lib/client'

import { IContextConfig, ReqConfig } from '@lib/types'

export interface ISearchLogsDataSource {
  logsDownloadAcquireTokenGet(
    id?: Array<string>,
    options?: ReqConfig
  ): AxiosPromise<string>

  // logsDownloadGet(token: string, options?: ReqConfig): AxiosPromise<void>

  logsTaskgroupPut(
    request: LogsearchCreateTaskGroupRequest,
    options?: ReqConfig
  ): AxiosPromise<LogsearchTaskGroupResponse>

  logsTaskgroupsGet(
    options?: ReqConfig
  ): AxiosPromise<Array<LogsearchTaskGroupModel>>

  logsTaskgroupsIdCancelPost(
    id: string,
    options?: ReqConfig
  ): AxiosPromise<object>

  logsTaskgroupsIdDelete(id: string, options?: ReqConfig): AxiosPromise<object>

  logsTaskgroupsIdGet(
    id: string,
    options?: ReqConfig
  ): AxiosPromise<LogsearchTaskGroupResponse>

  logsTaskgroupsIdPreviewGet(
    id: string,
    options?: ReqConfig
  ): AxiosPromise<Array<LogsearchPreviewModel>>

  logsTaskgroupsIdRetryPost(
    id: string,
    options?: ReqConfig
  ): AxiosPromise<object>

  getTiDBTopology(options?: ReqConfig): AxiosPromise<Array<TopologyTiDBInfo>>

  getStoreTopology(
    options?: ReqConfig
  ): AxiosPromise<ClusterinfoStoreTopologyResponse>

  getPDTopology(options?: ReqConfig): AxiosPromise<Array<TopologyPDInfo>>
}

export interface ISearchLogsContext {
  ds: ISearchLogsDataSource
  cfg: IContextConfig
}

export const SearchLogsContext = createContext<ISearchLogsContext | null>(null)

export const SearchLogsProvider = SearchLogsContext.Provider
