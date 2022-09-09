import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  TopologyPDInfo,
  TopologyTiDBInfo,
  TopologyGrafanaInfo,
  TopologyAlertManagerInfo,
  ClusterinfoStoreTopologyResponse,
  MetricsQueryResponse
} from '@lib/client'

import { IContextConfig, ReqConfig } from '@lib/types'
import { IQueryConfig, TransformNullValue } from 'metrics-chart'
export interface OverviewMetricsQueryType {
  title: string
  queries: IQueryConfig[]
  unit: string
  nullValue?: TransformNullValue
}

export interface IOverviewDataSource {
  getTiDBTopology(options?: ReqConfig): AxiosPromise<Array<TopologyTiDBInfo>>

  getStoreTopology(
    options?: ReqConfig
  ): AxiosPromise<ClusterinfoStoreTopologyResponse>

  getPDTopology(options?: ReqConfig): AxiosPromise<Array<TopologyPDInfo>>

  getGrafanaTopology(options?: ReqConfig): AxiosPromise<TopologyGrafanaInfo>

  getAlertManagerTopology(
    options?: ReqConfig
  ): AxiosPromise<TopologyAlertManagerInfo>

  getAlertManagerCounts(
    address: string,
    options?: ReqConfig
  ): AxiosPromise<number>

  metricsQueryGet(params: {
    endTimeSec?: number
    query?: string
    startTimeSec?: number
    stepSec?: number
  }): AxiosPromise<MetricsQueryResponse>
}

export interface IOverviewContext {
  ds: IOverviewDataSource
  cfg: IContextConfig & {
    metricsQueries: OverviewMetricsQueryType[]
  }
}

export const OverviewContext = createContext<IOverviewContext | null>(null)

export const OverviewProvider = OverviewContext.Provider
