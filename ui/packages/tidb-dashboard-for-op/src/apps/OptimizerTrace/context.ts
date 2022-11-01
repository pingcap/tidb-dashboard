import {
  IOptimizerTraceDataSource,
  IOptimizerTraceContext
  // ReqConfig
} from '@pingcap/tidb-dashboard-lib'

// import client, { QueryeditorRunRequest } from '~/client'

class DataSource implements IOptimizerTraceDataSource {}

export const ctx: IOptimizerTraceContext = {
  ds: new DataSource()
}
