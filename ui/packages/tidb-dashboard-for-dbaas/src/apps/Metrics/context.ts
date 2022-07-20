import {
  IMetricsDataSource,
  IMetricsContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

class DataSource implements IMetricsDataSource {
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

export const ctx: () => IMetricsContext = () => ({
  ds
})
