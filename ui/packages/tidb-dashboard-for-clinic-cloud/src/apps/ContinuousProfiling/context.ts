import {
  IConProfilingDataSource,
  IConProfilingContext,
  ReqConfig,
  IConProfilingConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { ConprofNgMonitoringConfig } from '~/client'

import publicPathBase from '~/utils/publicPathPrefix'

class DataSource implements IConProfilingDataSource {
  continuousProfilingActionTokenGet(q: string, options?: ReqConfig) {
    return client
      .getInstance()
      .continuousProfilingActionTokenGet({ q }, options)
  }

  continuousProfilingComponentsGet(options?: ReqConfig) {
    return client.getInstance().continuousProfilingComponentsGet(options)
  }

  continuousProfilingConfigGet(options?: ReqConfig) {
    return client.getInstance().continuousProfilingConfigGet(options)
  }

  continuousProfilingConfigPost(
    request: ConprofNgMonitoringConfig,
    options?: ReqConfig
  ) {
    return client
      .getInstance()
      .continuousProfilingConfigPost({ request }, options)
  }

  continuousProfilingDownloadGet(ts: number, options?: ReqConfig) {
    return client.getInstance().continuousProfilingDownloadGet({ ts }, options)
  }

  continuousProfilingEstimateSizeGet(options?: ReqConfig) {
    return client.getInstance().continuousProfilingEstimateSizeGet(options)
  }

  continuousProfilingGroupProfileDetailGet(ts: number, options?: ReqConfig) {
    return client
      .getInstance()
      .continuousProfilingGroupProfileDetailGet({ ts }, options)
  }

  continuousProfilingGroupProfilesGet(
    beginTime?: number,
    endTime?: number,
    options?: ReqConfig
  ) {
    return client
      .getInstance()
      .continuousProfilingGroupProfilesGet({ beginTime, endTime }, options)
  }

  continuousProfilingSingleProfileViewGet(
    address?: string,
    component?: string,
    profileType?: string,
    ts?: number,
    options?: ReqConfig
  ) {
    return client
      .getInstance()
      .continuousProfilingSingleProfileViewGet(
        { address, component, profileType, ts },
        options
      )
  }

  getTiDBTopology(options?: ReqConfig) {
    return client.getInstance().getTiDBTopology(options)
  }
  getStoreTopology(options?: ReqConfig) {
    return client.getInstance().getStoreTopology(options)
  }
  getPDTopology(options?: ReqConfig) {
    return client.getInstance().getPDTopology(options)
  }
}

const ds = new DataSource()

export const ctx: (
  cfg: Partial<IConProfilingConfig>
) => IConProfilingContext = (cfg) => ({
  ds,
  cfg: {
    apiPathBase: client.getBasePath(),
    publicPathBase,
    ...cfg
  }
})
