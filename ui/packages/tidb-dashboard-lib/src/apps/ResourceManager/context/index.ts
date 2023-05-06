import {
  MetricsQueryResponse,
  ResourcemanagerCalibrateResponse,
  ResourcemanagerGetConfigResponse,
  ResourcemanagerResourceInfoRowDef
} from '@lib/client'
import { ReqConfig } from '@lib/types'
import { AxiosPromise } from 'axios'
import { createContext, useContext } from 'react'

export interface IResourceManagerDataSource {
  getConfig(options?: ReqConfig): AxiosPromise<ResourcemanagerGetConfigResponse>
  getInformation(
    options?: ReqConfig
  ): AxiosPromise<ResourcemanagerResourceInfoRowDef[]>

  getCalibrateByHardware(
    params: { workload: string },
    options?: ReqConfig
  ): AxiosPromise<ResourcemanagerCalibrateResponse>
  getCalibrateByActual(
    params: { startTime: number; endTime: number },
    options?: ReqConfig
  ): AxiosPromise<ResourcemanagerCalibrateResponse>

  metricsQueryGet(params: {
    endTimeSec?: number
    query?: string
    startTimeSec?: number
    stepSec?: number
  }): Promise<MetricsQueryResponse>
}

export interface IResourceManagerConfig {}

export interface IResourceManagerContext {
  ds: IResourceManagerDataSource
  cfg: IResourceManagerConfig
}

export const ResourceManagerContext =
  createContext<IResourceManagerContext | null>(null)

export const ResourceManagerProvider = ResourceManagerContext.Provider

export const useResourceManagerContext = () => {
  const ctx = useContext(ResourceManagerContext)
  if (ctx === null) {
    throw new Error('ResourceManagerContext must not be null')
  }
  return ctx
}
