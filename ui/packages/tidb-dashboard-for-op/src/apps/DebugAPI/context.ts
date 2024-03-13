import {
  IDebugAPIDataSource,
  IDebugAPIContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { EndpointRequestPayload } from '~/client'

class DataSource implements IDebugAPIDataSource {
  debugAPIGetEndpoints(options?: ReqConfig) {
    return client.getInstance().debugAPIGetEndpoints(options)
  }

  debugAPIRequestEndpoint(req: EndpointRequestPayload, options?: ReqConfig) {
    return client.getInstance().debugAPIRequestEndpoint(
      {
        req: {
          ...req,
          // To compatible with the old tidb-dashboard backend api before 5.4.0
          // By PR https://github.com/pingcap/tidb-dashboard/pull/1103 (release to v2021.12.30.1 and PD 5.4.0)
          // It changes `id` to `api_id`, `params` to `param_values`
          id: req.api_id,
          params: req.param_values
        } as any
      },
      options
    )
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

  getTiProxyTopology(options?: ReqConfig) {
    return client.getInstance().getTiProxyTopology(options)
  }
}

const ds = new DataSource()

export const ctx: IDebugAPIContext = {
  ds,
  cfg: { apiPathBase: client.getBasePath() }
}
