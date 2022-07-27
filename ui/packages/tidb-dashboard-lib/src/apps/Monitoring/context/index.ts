import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { MetricsQueryResponse } from '@lib/client'

import { ReqConfig } from '@lib/types'

// interface MetricsQueriesType {

// }

type ClusterType = 'op' | 'cloud'

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
  cfg: {
    metricsQueries: any
    clusterType: ClusterType
  }
}

export const MonitoringContext = createContext<IMonitoringContext | null>(null)

export const MonitoringProvider = MonitoringContext.Provider
