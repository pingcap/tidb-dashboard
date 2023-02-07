import { createContext } from 'react'

import { MetricsQueryResponse } from '@lib/client'

import { QueryConfig, TransformNullValue } from 'metrics-chart'

export interface MetricsQueryType {
  category?: string
  metrics: {
    title: string
    queries: QueryConfig[]
    unit: string
    nullValue?: TransformNullValue
  }[]
}

interface IMetricConfig {
  getMetricsQueries: (pdVersion: string | undefined) => MetricsQueryType[]
  promAddrConfigurable?: boolean
  timeRangeSelector?: {
    recent_seconds: number[]
    customAbsoluteRangePicker: boolean
  }
  metricsReferenceLink?: string
}

export interface IMonitoringDataSource {
  metricsQueryGet(params: {
    endTimeSec?: number
    query?: string
    startTimeSec?: number
    stepSec?: number
  }): Promise<MetricsQueryResponse>
}

export interface IMonitoringContext {
  ds: IMonitoringDataSource
  cfg: IMetricConfig
}

export const MonitoringContext = createContext<IMonitoringContext | null>(null)

export const MonitoringProvider = MonitoringContext.Provider
