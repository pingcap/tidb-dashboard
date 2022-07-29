import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { MetricsQueryResponse } from '@lib/client'

import { ColorType, TransformNullValue } from '@lib/utils'

import { GraphType, QueryData } from '@lib/components'

import { ReqConfig } from '@lib/types'

type ClusterType = 'op' | 'cloud'

interface MetricsQueryType {
  category: string
  metrics: {
    title: string
    queries: {
      query: string
      name: string
      color?: ColorType | ((qd: QueryData) => ColorType)
      type?: GraphType
    }[]
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
