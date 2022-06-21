import {
  IInstanceProfilingDataSource,
  IInstanceProfilingContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { ProfilingStartRequest } from '~/client'

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
}

const ds = new DataSource()

export const ctx: IInstanceProfilingContext = {
  ds,
  cfg: { basePath: client.getBasePath() }
}
