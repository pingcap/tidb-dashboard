import {
  IConProfilingDataSource,
  IConProfilingContext,
  ReqConfig,
  IConProfilingConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { ConprofNgMonitoringConfig } from '~/client'

import publicPathBase from '~/utils/publicPathPrefix'

class DataSource implements IConProfilingDataSource {
  private headers: {} = {}

  constructor(cfg: Partial<IConProfilingConfig>) {
    this.headers =
      cfg.deployType === 'nextgen-host'
        ? {
            'x-cluster-id': cfg.clusterId,
            'x-deploy-type': 'premium'
          }
        : {}
  }

  continuousProfilingActionTokenGet(q: string, options?: ReqConfig) {
    return client
      .getInstance()
      .continuousProfilingActionTokenGet(
        { q },
        { headers: this.headers, ...options }
      )
  }

  continuousProfilingComponentsGet(options?: ReqConfig) {
    return client
      .getInstance()
      .continuousProfilingComponentsGet({ headers: this.headers, ...options })
  }

  continuousProfilingConfigGet(options?: ReqConfig) {
    return client
      .getInstance()
      .continuousProfilingConfigGet({ headers: this.headers, ...options })
  }

  continuousProfilingConfigPost(
    request: ConprofNgMonitoringConfig,
    options?: ReqConfig
  ) {
    return client
      .getInstance()
      .continuousProfilingConfigPost(
        { request },
        { headers: this.headers, ...options }
      )
  }

  continuousProfilingDownloadGet(ts: number, options?: ReqConfig) {
    return client
      .getInstance()
      .continuousProfilingDownloadGet(
        { ts },
        { headers: this.headers, ...options }
      )
  }

  continuousProfilingEstimateSizeGet(options?: ReqConfig) {
    return client
      .getInstance()
      .continuousProfilingEstimateSizeGet({ headers: this.headers, ...options })
  }

  continuousProfilingGroupProfileDetailGet(ts: number, options?: ReqConfig) {
    return client
      .getInstance()
      .continuousProfilingGroupProfileDetailGet(
        { ts },
        { headers: this.headers, ...options }
      )
  }

  continuousProfilingGroupProfilesGet(
    beginTime?: number,
    endTime?: number,
    options?: ReqConfig
  ) {
    return client
      .getInstance()
      .continuousProfilingGroupProfilesGet(
        { beginTime, endTime },
        { headers: this.headers, ...options }
      )
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
        { headers: this.headers, ...options }
      )
  }

  getTiDBTopology(options?: ReqConfig) {
    return client
      .getInstance()
      .getTiDBTopology({ headers: this.headers, ...options })
  }
  getStoreTopology(options?: ReqConfig) {
    return client
      .getInstance()
      .getStoreTopology({ headers: this.headers, ...options })
  }
  getPDTopology(options?: ReqConfig) {
    return client
      .getInstance()
      .getPDTopology({ headers: this.headers, ...options })
  }
}

export const ctx: (
  cfg: Partial<IConProfilingConfig>
) => IConProfilingContext = (cfg) => ({
  ds: new DataSource(cfg),
  cfg: {
    apiPathBase: client.getBasePath(),
    publicPathBase,
    ...cfg
  }
})
