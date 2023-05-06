import {
  IMonitoringDataSource,
  IMonitoringContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

import { getMonitoringItems } from './metricsQueries'

class DataSource implements IMonitoringDataSource {
  metricsQueryGet(params: {
    endTimeSec?: number
    query?: string
    startTimeSec?: number
    stepSec?: number
  }) {
    return client
      .getInstance()
      .metricsQueryGet(params, {
        handleError: 'custom'
      } as ReqConfig)
      .then((res) => res.data)
  }
}

const ds = new DataSource()

export const ctx: IMonitoringContext = {
  ds,
  cfg: {
    getMetricsQueries: (pdVersion: string | undefined) =>
      getMonitoringItems(pdVersion),
    promAddrConfigurable: true,
    metricsReferenceLink:
      'https://docs.pingcap.com/tidb/stable/dashboard-monitoring'
  }
}
