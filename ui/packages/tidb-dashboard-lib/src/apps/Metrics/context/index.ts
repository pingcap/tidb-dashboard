import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { MetricsQueryResponse } from '@lib/client'

import { ReqConfig } from '@lib/types'

export interface IMetricsDataSource {
  metricsQueryGet(
    endTimeSec?: number,
    query?: string,
    startTimeSec?: number,
    stepSec?: number,
    options?: ReqConfig
  ): AxiosPromise<MetricsQueryResponse>
}

export interface IMetricsContext {
  ds: IMetricsDataSource
}

export const MetricsContext = createContext<IMetricsContext | null>(null)

export const MetricsProvider = MetricsContext.Provider
