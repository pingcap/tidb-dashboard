import {
  ISQLAdvisorDataSource,
  ISQLAdvisorContext
} from '@pingcap/tidb-dashboard-lib'
import { getGlobalConfig } from '~/utils/globalConfig'

const { clusterInfo, performanceInsightBaseUrl } = getGlobalConfig()
const { orgId, clusterId, projectId } = clusterInfo

const csrfToken = localStorage.getItem('clinic.auth.csrf_token')

class DataSource implements ISQLAdvisorDataSource {
  tuningListGet() {
    return fetch(
      `${performanceInsightBaseUrl}?BackMethod=GetTunedIndexLists&tenantId=${orgId}&projectId=${projectId}&clusterId=${clusterId}&token=${csrfToken}`
    ).then((res) => res.json())
  }

  tuningTaskCreate(startTime: number, endTime: number) {
    return fetch(
      `${performanceInsightBaseUrl}?BackMethod=CreateAdviseTask&tenantId=${orgId}&projectId=${projectId}&clusterId=${clusterId}&startTime=${startTime}&endTime=${endTime}&token=${csrfToken}`
    ).then((res) => res.json())
  }

  tuningTaskStatusGet() {
    return fetch(
      `${performanceInsightBaseUrl}?BackMethod=IsOKForTuningTask&tenantId=${orgId}&projectId=${projectId}&clusterId=${clusterId}&token=${csrfToken}`
    ).then((res) => res.json())
  }

  tuningDetailGet(id: number) {
    return fetch(
      `${performanceInsightBaseUrl}?BackMethod=GetTuningResult&ID=${id}&token=${csrfToken}`
    ).then((res) => res.json())
  }
}

const ds = new DataSource()

export const ctx: ISQLAdvisorContext = {
  ds,
  orgId,
  clusterId
}
