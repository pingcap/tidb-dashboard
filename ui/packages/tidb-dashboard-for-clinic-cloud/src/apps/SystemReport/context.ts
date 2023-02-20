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

export type DsExtra = {
  orgId: string
  clusterId: string
}

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
  constructor(public extra: DsExtra) {}

  public apiPathBase = client.getBasePath()

  public publicPathBase = publicPathBase

  public fullReportLink(reportId: string): string {
    const { orgId, clusterId } = this.extra
    return `${publicPathBase}/diagnose-report/?orgId=${orgId}&clusterId=${clusterId}&reportId=${reportId}`
  }
}

export const ctx: (extra: DsExtra) => ISystemReportContext = (extra) => ({
  ds: new DataSource(),
  cfg: new SystemReportConfig(extra)
})
