import {
  ISQLAdvisorDataSource,
  ISQLAdvisorContext
} from '@pingcap/tidb-dashboard-lib'

import { IGlobalConfig } from '~/utils/global-config'
import client from '~/client'

class DataSource implements ISQLAdvisorDataSource {
  constructor(public globalConfig: IGlobalConfig) {}

  clusterInfo = this.globalConfig.clusterInfo
  orgId = this.clusterInfo.orgId
  clusterId = this.clusterInfo.clusterId
  projectId = this.clusterInfo.projectId
  performanceInsightBaseUrl = this.globalConfig.performanceInsightBaseUrl

  client = client.getAxiosInstance()

  tuningListGet(pageNumber?: number, pageSize?: number) {
    return this.client
      .get(
        `${this.performanceInsightBaseUrl}/performance_insight/index_advisor/results?page=${pageNumber}&limit=${pageSize}`
      )
      .then((res) => res.data)
  }

  tuningDetailGet(id: number) {
    return this.client
      .get(
        `${this.performanceInsightBaseUrl}/performance_insight/index_advisor/results/${id}`
      )
      .then((res) => res.data)
  }

  tuningLatestGet() {
    return this.client
      .get(`${this.performanceInsightBaseUrl}/performance_insight/tasks/latest`)
      .then((res) => res.data)
  }

  tuningTaskCreate() {
    return this.client
      .post(`${this.performanceInsightBaseUrl}/performance_insight/tasks`, {})
      .then((res) => res.data)
  }

  tuningTaskCancel(id: number) {
    return this.client
      .delete(
        `${this.performanceInsightBaseUrl}/performance_insight/tasks/${id}`
      )
      .then((res) => res.data)
  }

  activateDBConnection(params: { userName: string; password: string }) {
    const { userName, password } = params
    return this.client
      .post(
        `${this.performanceInsightBaseUrl}/performance_insight/tidb_connection`,
        { user: userName, password }
      )
      .then((res) => res.data)
  }

  deactivateDBConnection() {
    return this.client
      .delete(
        `${this.performanceInsightBaseUrl}/performance_insight/tidb_connection`
      )
      .then((res) => res.data)
  }

  checkDBConnection() {
    return this.client
      .get(
        `${this.performanceInsightBaseUrl}/performance_insight/tidb_connection`
      )
      .then((res) => res.data)
  }
}

export const ctx: (globalConfig: IGlobalConfig) => ISQLAdvisorContext = (
  globalConfig
) => ({
  ds: new DataSource(globalConfig),
  orgId: globalConfig.clusterInfo.orgId,
  clusterId: globalConfig.clusterInfo.clusterId,
  registerUserDB: true
})
