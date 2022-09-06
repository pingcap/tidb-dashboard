import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { MetricsQueryResponse } from '@lib/client'

import { TransformNullValue } from '@lib/utils'

import { GraphType, IQueryOption } from '@lib/components'

import { ReqConfig } from '@lib/types'

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
  getMetricsQueries: (pdVersion: string | undefined) => MetricsQueryType[]
  promeAddrConfigurable?: boolean
  timeRangeSelector?: {
    recent_seconds: number[]
    withAbsoluteRangePicker: boolean
  }
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
