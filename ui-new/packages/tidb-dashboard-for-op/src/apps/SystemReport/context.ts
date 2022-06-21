import {
  ISystemReportDataSource,
  ISystemReportContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, {
  DiagnoseGenerateReportRequest,
  DiagnoseGenerateMetricsRelationRequest
} from '~/client'

class DataSource implements ISystemReportDataSource {
  diagnoseReportsGet(options?: ReqConfig) {
    return client.getInstance().diagnoseReportsGet(options)
  }

  diagnoseReportsPost(
    request: DiagnoseGenerateReportRequest,
    options?: ReqConfig
  ) {
    return client.getInstance().diagnoseReportsPost({ request }, options)
  }

  diagnoseGenerateMetricsRelationship(
    request: DiagnoseGenerateMetricsRelationRequest,
    options?: ReqConfig
  ) {
    return client
      .getInstance()
      .diagnoseGenerateMetricsRelationship({ request }, options)
  }
  diagnoseReportsIdStatusGet(id: string, options?: ReqConfig) {
    return client.getInstance().diagnoseReportsIdStatusGet({ id }, options)
  }
}

const ds = new DataSource()

export const ctx: ISystemReportContext = {
  ds,
  cfg: { basePath: client.getBasePath() }
}
