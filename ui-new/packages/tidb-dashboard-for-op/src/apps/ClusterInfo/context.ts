import {
  IClusterInfoDataSource,
  IClusterInfoContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'
import { AxiosPromise } from 'axios'

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

  topologyTidbAddressDelete(address: string, options?: ReqConfig) {
    return client.getInstance().topologyTidbAddressDelete({ address }, options)
  }
}

const ds = new DataSource()

export const ctx: IClusterInfoContext = {
  ds,
  cfg: { basePath: client.getBasePath() }
}
