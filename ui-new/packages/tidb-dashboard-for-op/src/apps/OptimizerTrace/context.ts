import {
  IOptimizerTraceDataSource,
  IOptimizerTraceContext
  // ReqConfig
} from '@pingcap/tidb-dashboard-lib'

// import client from '~/client'

class DataSource implements IOptimizerTraceDataSource {}

const ds = new DataSource()

export const ctx: IOptimizerTraceContext = {
  ds
}
