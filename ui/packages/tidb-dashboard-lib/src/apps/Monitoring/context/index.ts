import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { MetricsQueryResponse } from '@lib/client'

import { ReqConfig } from '@lib/types'

export interface IMonitoringDataSource {
  metricsQueryGet(
    endTimeSec?: number,
    query?: string,
    startTimeSec?: number,
    stepSec?: number,
    options?: ReqConfig
  ): AxiosPromise<MetricsQueryResponse>
}

export interface IMonitoringContext {
  ds: IMonitoringDataSource
  metricsQueries: any
}

export const MonitoringContext = createContext<IMonitoringContext | null>(null)

export const MonitoringProvider = MonitoringContext.Provider
