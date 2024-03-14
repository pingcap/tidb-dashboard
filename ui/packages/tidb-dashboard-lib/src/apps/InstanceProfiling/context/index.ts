import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  ProfilingGroupDetailResponse,
  ProfilingTaskGroupModel,
  ProfilingStartRequest,
  ConprofNgMonitoringConfig,
  TopologyTiDBInfo,
  ClusterinfoStoreTopologyResponse,
  TopologyPDInfo,
  TopologyTiCDCInfo,
  TopologyTiProxyInfo,
  TopologyTSOInfo,
  TopologySchedulingInfo
} from '@lib/client'

import { IContextConfig, ReqConfig } from '@lib/types'

export interface IInstanceProfilingDataSource {
  getActionToken(
    id?: string,
    action?: string,
    options?: ReqConfig
  ): AxiosPromise<string>

  getProfilingGroupDetail(
    groupId: string,
    options?: ReqConfig
  ): AxiosPromise<ProfilingGroupDetailResponse>

  getProfilingGroups(
    options?: ReqConfig
  ): AxiosPromise<Array<ProfilingTaskGroupModel>>

  startProfiling(
    req: ProfilingStartRequest,
    options?: ReqConfig
  ): AxiosPromise<ProfilingTaskGroupModel>

  continuousProfilingConfigGet(
    options?: ReqConfig
  ): AxiosPromise<ConprofNgMonitoringConfig>

  getTiDBTopology(options?: ReqConfig): AxiosPromise<Array<TopologyTiDBInfo>>

  getStoreTopology(
    options?: ReqConfig
  ): AxiosPromise<ClusterinfoStoreTopologyResponse>

  getPDTopology(options?: ReqConfig): AxiosPromise<Array<TopologyPDInfo>>

  getTiCDCTopology(options?: ReqConfig): AxiosPromise<Array<TopologyTiCDCInfo>>

  getTiProxyTopology(
    options?: ReqConfig
  ): AxiosPromise<Array<TopologyTiProxyInfo>>

  getTSOTopology(options?: ReqConfig): AxiosPromise<Array<TopologyTSOInfo>>

  getSchedulingTopology(
    options?: ReqConfig
  ): AxiosPromise<Array<TopologySchedulingInfo>>
}

export interface IInstanceProfilingContext {
  ds: IInstanceProfilingDataSource
  cfg: IContextConfig & { publicPathBase: string }
}

export const InstanceProfilingContext =
  createContext<IInstanceProfilingContext | null>(null)

export const InstanceProfilingProvider = InstanceProfilingContext.Provider
