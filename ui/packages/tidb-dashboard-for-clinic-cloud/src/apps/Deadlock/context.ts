import {
  IDeadlockDataSource,
  IDeadlockContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

class DataSource implements IDeadlockDataSource {
  deadlockListGet(options?: ReqConfig) {
    return client.getInstance().deadlockListGet(options)
  }
}

const ds = new DataSource()

export const ctx: IDeadlockContext = {
  ds
}
