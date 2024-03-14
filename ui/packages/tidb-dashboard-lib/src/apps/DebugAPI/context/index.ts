import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  EndpointAPIDefinition,
  EndpointRequestPayload,
  InfoTableSchema,
  TopologyTiDBInfo,
  ClusterinfoStoreTopologyResponse,
  TopologyPDInfo,
  TopologyTiProxyInfo
} from '@lib/client'

import { IContextConfig, ReqConfig } from '@lib/types'

export interface IDebugAPIDataSource {
  debugAPIGetEndpoints(
    options?: ReqConfig
  ): AxiosPromise<Array<EndpointAPIDefinition>>

  debugAPIRequestEndpoint(
    req: EndpointRequestPayload,
    options?: ReqConfig
  ): AxiosPromise<string>

  infoListDatabases(options?: ReqConfig): AxiosPromise<Array<string>>

  infoListTables(
    databaseName?: string,
    options?: ReqConfig
  ): AxiosPromise<Array<InfoTableSchema>>

  getTiDBTopology(options?: ReqConfig): AxiosPromise<Array<TopologyTiDBInfo>>

  getStoreTopology(
    options?: ReqConfig
  ): AxiosPromise<ClusterinfoStoreTopologyResponse>

  getPDTopology(options?: ReqConfig): AxiosPromise<Array<TopologyPDInfo>>

  getTiProxyTopology(
    options?: ReqConfig
  ): AxiosPromise<Array<TopologyTiProxyInfo>>
}

export interface IDebugAPIContext {
  ds: IDebugAPIDataSource
  cfg: IContextConfig
}

export const DebugAPIContext = createContext<IDebugAPIContext | null>(null)

export const DebugAPIProvider = DebugAPIContext.Provider
