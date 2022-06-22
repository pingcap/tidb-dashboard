import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  ConprofComponent,
  ConprofNgMonitoringConfig,
  ConprofEstimateSizeRes,
  ConprofGroupProfileDetail,
  ConprofGroupProfiles,
  TopologyTiDBInfo,
  ClusterinfoStoreTopologyResponse,
  TopologyPDInfo
} from '@lib/client'

import { IContextConfig, ReqConfig } from '@lib/types'

export interface IConProfilingDataSource {
  continuousProfilingActionTokenGet(
    q: string,
    options?: ReqConfig
  ): AxiosPromise<string>

  continuousProfilingComponentsGet(
    options?: ReqConfig
  ): AxiosPromise<Array<ConprofComponent>>

  continuousProfilingConfigGet(
    options?: ReqConfig
  ): AxiosPromise<ConprofNgMonitoringConfig>

  continuousProfilingConfigPost(
    request: ConprofNgMonitoringConfig,
    options?: ReqConfig
  ): AxiosPromise<string>

  continuousProfilingEstimateSizeGet(
    options?: ReqConfig
  ): AxiosPromise<ConprofEstimateSizeRes>

  continuousProfilingGroupProfileDetailGet(
    ts: number,
    options?: ReqConfig
  ): AxiosPromise<ConprofGroupProfileDetail>

  continuousProfilingGroupProfilesGet(
    beginTime?: number,
    endTime?: number,
    options?: ReqConfig
  ): AxiosPromise<Array<ConprofGroupProfiles>>

  getTiDBTopology(options?: ReqConfig): AxiosPromise<Array<TopologyTiDBInfo>>

  getStoreTopology(
    options?: ReqConfig
  ): AxiosPromise<ClusterinfoStoreTopologyResponse>

  getPDTopology(options?: ReqConfig): AxiosPromise<Array<TopologyPDInfo>>
}

export interface IConProfilingContext {
  ds: IConProfilingDataSource
  cfg: IContextConfig
}

export const ConProfilingContext = createContext<IConProfilingContext | null>(
  null
)

export const ConProfilingProvider = ConProfilingContext.Provider
