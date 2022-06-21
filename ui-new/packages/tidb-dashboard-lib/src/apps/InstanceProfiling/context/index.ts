import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  ProfilingGroupDetailResponse,
  ProfilingTaskGroupModel,
  ProfilingStartRequest,
  ConprofNgMonitoringConfig
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
}

export interface IInstanceProfilingContext {
  ds: IInstanceProfilingDataSource
  cfg: IContextConfig
}

export const InstanceProfilingContext =
  createContext<IInstanceProfilingContext | null>(null)

export const InstanceProfilingProvider = InstanceProfilingContext.Provider
