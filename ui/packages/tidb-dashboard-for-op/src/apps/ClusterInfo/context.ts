import {
  IClusterInfoDataSource,
  IClusterInfoContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

class DataSource implements IClusterInfoDataSource {
  clusterInfoGetHostsInfo(options?: ReqConfig) {
    return client.getInstance().clusterInfoGetHostsInfo(options)
  }

  getStoreLocationTopology(options?: ReqConfig) {
    return client.getInstance().getStoreLocationTopology(options)
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

  getTiCDCTopology(options?: ReqConfig) {
    return client.getInstance().getTiCDCTopology(options)
  }

  getTiProxyTopology(options?: ReqConfig) {
    return client.getInstance().getTiProxyTopology(options)
  }

  getTSOTopology(options?: ReqConfig) {
    return client.getInstance().getTSOTopology(options)
  }

  getSchedulingTopology(options?: ReqConfig) {
    return client.getInstance().getSchedulingTopology(options)
  }

  topologyTidbAddressDelete(address: string, options?: ReqConfig) {
    return client.getInstance().topologyTidbAddressDelete({ address }, options)
  }

  clusterInfoGetStatistics(options?: ReqConfig) {
    return client.getInstance().clusterInfoGetStatistics(options)
  }
}

const ds = new DataSource()

export const ctx: IClusterInfoContext = {
  ds,
  cfg: { apiPathBase: client.getBasePath() }
}
