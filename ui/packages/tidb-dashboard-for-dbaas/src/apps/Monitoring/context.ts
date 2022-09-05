import {
  IMonitoringDataSource,
  IMonitoringContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

import { getMonitoringItems } from './metricsQueries'

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

const RECENT_SECONDS = [
  5 * 60,
  15 * 60,
  30 * 60,
  60 * 60,
  3 * 60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60
]

export const ctx: () => IMonitoringContext = () => ({
  ds,
  cfg: {
    getMetricsQueries: (pdVersion: string | undefined) =>
      getMonitoringItems(pdVersion),
    promeAddrConfigurable: false,
    timeRangeSelector: {
      recent_seconds: RECENT_SECONDS,
      withAbsoluteRangePicker: false
    }
  }
})
