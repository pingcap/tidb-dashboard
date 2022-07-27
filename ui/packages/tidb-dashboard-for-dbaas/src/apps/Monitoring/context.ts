import {
  IMonitoringDataSource,
  IMonitoringContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

import { monitoringItems } from './metricsQueries'
class DataSource implements IMonitoringDataSource {
  metricsQueryGet(
    endTimeSec?: number,
    query?: string,
    startTimeSec?: number,
    stepSec?: number,
    options?: ReqConfig
  ) {
    return client.getInstance().metricsQueryGet(
      {
        endTimeSec,
        query,
        startTimeSec,
        stepSec
      },
      options
    )
  }
}

const ds = new DataSource()

export const ctx: () => IMonitoringContext = () => ({
  ds,
  cfg: {
    metricsQueries: monitoringItems,
    clusterType: 'cloud'
  }
})
