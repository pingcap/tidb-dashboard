import {
  IDiagnoseDataSource,
  IDiagnoseContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { DiagnoseGenDiagnosisReportRequest } from '~/client'

class DataSource implements IDiagnoseDataSource {
  diagnoseDiagnosisPost(
    request: DiagnoseGenDiagnosisReportRequest,
    options?: ReqConfig
  ) {
    return client.getInstance().diagnoseDiagnosisPost({ request }, options)
  }
}

const ds = new DataSource()

export const ctx: IDiagnoseContext = {
  ds
}
