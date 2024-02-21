import {
  ISearchLogsDataSource,
  ISearchLogsContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { LogsearchCreateTaskGroupRequest } from '~/client'

class DataSource implements ISearchLogsDataSource {
  logsDownloadAcquireTokenGet(id?: Array<string>, options?: ReqConfig) {
    return client.getInstance().logsDownloadAcquireTokenGet({ id }, options)
  }

  // logsDownloadGet(token: string, options?: ReqConfig) {
  //   return client.getInstance().logsDownloadGet({ token }, options)
  // }

  logsTaskgroupPut(
    request: LogsearchCreateTaskGroupRequest,
    options?: ReqConfig
  ) {
    return client.getInstance().logsTaskgroupPut({ request }, options)
  }

  logsTaskgroupsGet(options?: ReqConfig) {
    return client.getInstance().logsTaskgroupsGet(options)
  }

  logsTaskgroupsIdCancelPost(id: string, options?: ReqConfig) {
    return client.getInstance().logsTaskgroupsIdCancelPost({ id }, options)
  }

  logsTaskgroupsIdDelete(id: string, options?: ReqConfig) {
    return client.getInstance().logsTaskgroupsIdDelete({ id }, options)
  }

  logsTaskgroupsIdGet(id: string, options?: ReqConfig) {
    return client.getInstance().logsTaskgroupsIdGet({ id }, options)
  }

  logsTaskgroupsIdPreviewGet(id: string, options?: ReqConfig) {
    return client.getInstance().logsTaskgroupsIdPreviewGet({ id }, options)
  }

  logsTaskgroupsIdRetryPost(id: string, options?: ReqConfig) {
    return client.getInstance().logsTaskgroupsIdRetryPost({ id }, options)
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
}

const ds = new DataSource()

export const ctx: ISearchLogsContext = {
  ds,
  cfg: { apiPathBase: client.getBasePath() }
}
