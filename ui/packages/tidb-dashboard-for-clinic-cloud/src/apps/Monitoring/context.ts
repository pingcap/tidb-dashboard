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

const RECENT_SECONDS = [
  5 * 60,
  15 * 60,
  30 * 60,
  60 * 60,
  3 * 60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
  2 * 24 * 60 * 60
]

const ds = new DataSource()

export const ctx: IMonitoringContext = {
  ds,
  cfg: {
    getMetricsQueries: (pdVersion: string | undefined) =>
      getMonitoringItems(pdVersion),
    timeRangeSelector: {
      recent_seconds: RECENT_SECONDS,
      customAbsoluteRangePicker: true
    }
  }
}
