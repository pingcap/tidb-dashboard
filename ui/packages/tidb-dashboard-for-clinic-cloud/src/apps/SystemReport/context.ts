import {
  ISystemReportDataSource,
  ISystemReportContext,
  ReqConfig,
  ISystemReportEvent
} from '@pingcap/tidb-dashboard-lib'

import client, {
  DiagnoseGenerateReportRequest,
  DiagnoseGenerateMetricsRelationRequest
} from '~/client'

import publicPathBase from '~/uilts/publicPathPrefix'

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

class SystemReportEvent implements ISystemReportEvent {
  constructor(public extra: DsExtra) {}

  getFullReportLink(reportID: string): string {
    const { orgId, clusterId } = this.extra
    return `${publicPathBase}/diagnose-report/?orgId=${orgId}&clusterId=${clusterId}&reportId=${reportID}`
  }
}

export const ctx: (extra: DsExtra) => ISystemReportContext = (extra) => ({
  ds: new DataSource(),
  event: new SystemReportEvent(extra),
  cfg: { apiPathBase: client.getBasePath(), publicPathBase }
})
