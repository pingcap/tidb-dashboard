import {
  IDebugAPIDataSource,
  IDebugAPIContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'
import { TopologyTiDBInfo } from '@pingcap/tidb-dashboard-lib/dist/client'
import { AxiosPromise } from 'axios'

import client, { EndpointRequestPayload } from '~/client'

class DataSource implements IDebugAPIDataSource {
  debugAPIGetEndpoints(options?: ReqConfig) {
    return client.getInstance().debugAPIGetEndpoints(options)
  }

  debugAPIRequestEndpoint(req: EndpointRequestPayload, options?: ReqConfig) {
    return client.getInstance().debugAPIRequestEndpoint({ req }, options)
  }

  infoListDatabases(options?: ReqConfig) {
    return client.getInstance().infoListDatabases(options)
  }

  infoListTables(databaseName?: string, options?: ReqConfig) {
    return client.getInstance().infoListTables({ databaseName }, options)
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

export const ctx: IDebugAPIContext = {
  ds,
  cfg: { basePath: client.getBasePath() }
}
