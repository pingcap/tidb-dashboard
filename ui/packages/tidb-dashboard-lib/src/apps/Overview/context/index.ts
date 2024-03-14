import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  TopologyPDInfo,
  TopologyTiDBInfo,
  TopologyGrafanaInfo,
  TopologyAlertManagerInfo,
  ClusterinfoStoreTopologyResponse,
  MetricsQueryResponse,
  TopologyTiCDCInfo,
  TopologyTiProxyInfo,
  TopologyTSOInfo,
  TopologySchedulingInfo
} from '@lib/client'

import { IContextConfig, ReqConfig } from '@lib/types'
import { QueryConfig, TransformNullValue } from 'metrics-chart'
export interface OverviewMetricsQueryType {
  title: string
  queries: QueryConfig[]
  unit: string
  nullValue?: TransformNullValue
}

interface IMetricConfig {
  metricsQueries: OverviewMetricsQueryType[]
  promAddrConfigurable?: boolean
  timeRangeSelector?: {
    recent_seconds: number[]
    customAbsoluteRangePicker: boolean
  }
  metricsReferenceLink?: string
}

export interface IOverviewDataSource {
  getTiDBTopology(options?: ReqConfig): AxiosPromise<Array<TopologyTiDBInfo>>

  getStoreTopology(
    options?: ReqConfig
  ): AxiosPromise<ClusterinfoStoreTopologyResponse>

  getPDTopology(options?: ReqConfig): AxiosPromise<Array<TopologyPDInfo>>

  getTiCDCTopology(options?: ReqConfig): AxiosPromise<Array<TopologyTiCDCInfo>>

  getTiProxyTopology(
    options?: ReqConfig
  ): AxiosPromise<Array<TopologyTiProxyInfo>>

  getTSOTopology(options?: ReqConfig): AxiosPromise<Array<TopologyTSOInfo>>

  getSchedulingTopology(
    options?: ReqConfig
  ): AxiosPromise<Array<TopologySchedulingInfo>>

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
  }): Promise<MetricsQueryResponse>
}

export type IOverviewConfig = IContextConfig &
  IMetricConfig & {
    showMetrics: boolean
  }

export interface IOverviewContext {
  ds: IOverviewDataSource
  cfg: IOverviewConfig
}

export const OverviewContext = createContext<IOverviewContext | null>(null)

export const OverviewProvider = OverviewContext.Provider
