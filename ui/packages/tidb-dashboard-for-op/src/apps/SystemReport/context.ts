import {
  ISystemReportDataSource,
  ISystemReportContext,
  ReqConfig,
  ISystemReportConfig
} from '@pingcap/tidb-dashboard-lib'

import client, {
  DiagnoseGenerateReportRequest,
  DiagnoseGenerateMetricsRelationRequest
} from '~/client'

import publicPathBase from '~/utils/publicPathPrefix'

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

class SystemReportConfig implements ISystemReportConfig {
  public apiPathBase = client.getBasePath()

  public publicPathBase = publicPathBase

  public fullReportLink(reportId: string): string {
    /* Not using client basePath intentionally so that it can be handled by dev server */
    return `${publicPathBase}/api/diagnose/reports/${reportId}/detail`
  }
}

export const ctx: ISystemReportContext = {
  ds: new DataSource(),
  cfg: new SystemReportConfig()
}
