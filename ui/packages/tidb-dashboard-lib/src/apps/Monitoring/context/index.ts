import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { MetricsQueryResponse } from '@lib/client'

import { QueryConfig, TransformNullValue } from 'metrics-chart'

export interface MetricsQueryType {
  category: string
  metrics: {
    title: string
    queries: QueryConfig[]
    unit: string
    nullValue?: TransformNullValue
  }[]
}

interface IMetricConfig {
  getMetricsQueries: (pdVersion: string | undefined) => MetricsQueryType[]
  promeAddrConfigurable?: boolean
  timeRangeSelector?: {
    recent_seconds: number[]
    withAbsoluteRangePicker: boolean
  }
}

export interface IMonitoringDataSource {
  metricsQueryGet(params: {
    endTimeSec?: number
    query?: string
    startTimeSec?: number
    stepSec?: number
  }): AxiosPromise<MetricsQueryResponse>
}

export interface IMonitoringContext {
  ds: IMonitoringDataSource
  cfg: IMetricConfig
}

export const MonitoringContext = createContext<IMonitoringContext | null>(null)

export const MonitoringProvider = MonitoringContext.Provider
