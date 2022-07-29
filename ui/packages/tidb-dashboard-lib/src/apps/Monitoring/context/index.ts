import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { MetricsQueryResponse } from '@lib/client'

import { TransformNullValue } from '@lib/utils'

import { GraphType, IQueryOption } from '@lib/components'

import { ReqConfig } from '@lib/types'

type ClusterType = 'op' | 'cloud'

export interface MetricsQueryType {
  category: string
  metrics: {
    title: string
    queries: IQueryOption[]
    unit: string
    type: GraphType
    nullValue?: TransformNullValue
  }[]
}

interface IMetricConfig {
  metricsQueries: MetricsQueryType[]
  clusterType: ClusterType
}

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
  cfg: IMetricConfig
}

export const MonitoringContext = createContext<IMonitoringContext | null>(null)

export const MonitoringProvider = MonitoringContext.Provider
