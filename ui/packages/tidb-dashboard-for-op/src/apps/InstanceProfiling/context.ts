import {
  IInstanceProfilingDataSource,
  IInstanceProfilingContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { ProfilingStartRequest } from '~/client'

import publicPathBase from '~/utils/publicPathPrefix'

class DataSource implements IInstanceProfilingDataSource {
  getActionToken(id?: string, action?: string, options?: ReqConfig) {
    return client.getInstance().getActionToken({ id, action }, options)
  }
  getProfilingGroupDetail(groupId: string, options?: ReqConfig) {
    return client.getInstance().getProfilingGroupDetail({ groupId }, options)
  }
  getProfilingGroups(options?: ReqConfig) {
    return client.getInstance().getProfilingGroups(options)
  }
  startProfiling(req: ProfilingStartRequest, options?: ReqConfig) {
    return client.getInstance().startProfiling({ req }, options)
  }
  continuousProfilingConfigGet(options?: ReqConfig) {
    return client.getInstance().continuousProfilingConfigGet(options)
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

export const ctx: IInstanceProfilingContext = {
  ds,
  cfg: { apiPathBase: client.getBasePath(), publicPathBase }
}
