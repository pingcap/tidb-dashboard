import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  ClusterinfoGetHostsInfoResponse,
  TopologyStoreLocation,
  TopologyTiDBInfo,
  ClusterinfoStoreTopologyResponse,
  TopologyPDInfo,
  ClusterinfoClusterStatistics,
  TopologyTiCDCInfo,
  TopologyTiProxyInfo
} from '@lib/client'

import { IContextConfig, ReqConfig } from '@lib/types'

export interface IClusterInfoDataSource {
  clusterInfoGetHostsInfo(
    options?: ReqConfig
  ): AxiosPromise<ClusterinfoGetHostsInfoResponse>

  getStoreLocationTopology(
    options?: ReqConfig
  ): AxiosPromise<TopologyStoreLocation>

  getTiDBTopology(options?: ReqConfig): AxiosPromise<Array<TopologyTiDBInfo>>

  getStoreTopology(
    options?: ReqConfig
  ): AxiosPromise<ClusterinfoStoreTopologyResponse>

  getPDTopology(options?: ReqConfig): AxiosPromise<Array<TopologyPDInfo>>

  getTiCDCTopology(options?: ReqConfig): AxiosPromise<Array<TopologyTiCDCInfo>>

  getTiProxyTopology(
    options?: ReqConfig
  ): AxiosPromise<Array<TopologyTiProxyInfo>>

  topologyTidbAddressDelete(
    address: string,
    options?: ReqConfig
  ): AxiosPromise<void>

  clusterInfoGetStatistics(
    options?: ReqConfig
  ): AxiosPromise<ClusterinfoClusterStatistics>
}

export interface IClusterInfoContext {
  ds: IClusterInfoDataSource
  cfg: IContextConfig
}

export const ClusterInfoContext = createContext<IClusterInfoContext | null>(
  null
)

export const ClusterInfoProvider = ClusterInfoContext.Provider
