import {
  IQueryEditorDataSource,
  IQueryEditorContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { QueryeditorRunRequest } from '~/client'

class DataSource implements IQueryEditorDataSource {
  queryEditorRun(request: QueryeditorRunRequest, options?: ReqConfig) {
    return client.getInstance().queryEditorRun({ request }, options)
  }
}

const ds = new DataSource()

export const ctx: IQueryEditorContext = {
  ds
}
