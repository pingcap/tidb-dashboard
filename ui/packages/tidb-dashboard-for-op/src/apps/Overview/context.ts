import {
  IOverviewDataSource,
  IOverviewContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'
import { overviewMetrics } from './metricsQueries'

class DataSource implements IOverviewDataSource {
  getTiDBTopology(options?: ReqConfig) {
    return client.getInstance().getTiDBTopology(options)
  }

  getStoreTopology(options?: ReqConfig) {
    return client.getInstance().getStoreTopology(options)
  }

  getPDTopology(options?: ReqConfig) {
    return client.getInstance().getPDTopology(options)
  }

  metricsQueryGet(params: {
    endTimeSec?: number
    query?: string
    startTimeSec?: number
    stepSec?: number
  }) {
    return client.getInstance().metricsQueryGet({ ...params }, {
      handleError: 'custom'
    } as ReqConfig)
  }

  getGrafanaTopology(options?: ReqConfig) {
    return client.getInstance().getGrafanaTopology(options)
  }

  getAlertManagerTopology(options?: ReqConfig) {
    return client.getInstance().getAlertManagerTopology(options)
  }

  getAlertManagerCounts(address: string, options?: ReqConfig) {
    return client.getInstance().getAlertManagerCounts({ address }, options)
  }
}

const ds = new DataSource()

export const ctx: IOverviewContext = {
  ds,
  cfg: {
    apiPathBase: client.getBasePath(),
    metricsQueries: overviewMetrics
  }
}
