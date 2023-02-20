import {
  ISQLAdvisorDataSource,
  ISQLAdvisorContext
} from '@pingcap/tidb-dashboard-lib'

import { IGlobalConfig } from '~/utils/global-config'

class DataSource implements ISQLAdvisorDataSource {
  constructor(public globalConfig: IGlobalConfig) {}

  clusterInfo = this.globalConfig.clusterInfo
  orgId = this.clusterInfo.orgId
  clusterId = this.clusterInfo.clusterId
  projectId = this.clusterInfo.projectId
  token = this.globalConfig.apiToken
  performanceInsightBaseUrl = this.globalConfig.performanceInsightBaseUrl

  tuningListGet(type: string) {
    return fetch(
      `${this.performanceInsightBaseUrl}?BackMethod=GetTunedIndexLists&orgId=${this.orgId}&projectId=${this.projectId}&clusterId=${this.clusterId}&type=${type}`,
      {
        headers: {
          token: `Bearer ${this.token}`
        }
      }
    ).then((res) => res.json())
  }

  tuningTaskCreate(startTime: number, endTime: number) {
    return fetch(
      `${this.performanceInsightBaseUrl}?BackMethod=CreateAdviseTask&orgId=${this.orgId}&projectId=${this.projectId}&clusterId=${this.clusterId}&startTime=${startTime}&endTime=${endTime}`,
      {
        headers: {
          token: `Bearer ${this.token}`
        }
      }
    ).then((res) => res.json())
  }

  tuningTaskStatusGet() {
    return fetch(
      `${this.performanceInsightBaseUrl}?BackMethod=IsOKForTuningTask&orgId=${this.orgId}&projectId=${this.projectId}&clusterId=${this.clusterId}`,
      {
        headers: {
          token: `Bearer ${this.token}`
        }
      }
    ).then((res) => res.json())
  }

  tuningDetailGet(id: number) {
    return fetch(
      `${this.performanceInsightBaseUrl}?BackMethod=GetTuningResult&ID=${id}&orgId=${this.orgId}&projectId=${this.projectId}&clusterId=${this.clusterId}`,
      {
        headers: {
          token: `Bearer ${this.token}`
        }
      }
    ).then((res) => res.json())
  }

  registerUserDB(params: { userName: string; password: string }) {
    const { userName, password } = params
    return fetch(
      `${this.performanceInsightBaseUrl}?BackMethod=RegisterUserDB&orgId=${this.orgId}&projectId=${this.projectId}&clusterId=${this.clusterId}&userName=${userName}&password=${password}`,
      {
        headers: {
          token: `Bearer ${this.token}`
        }
      }
    ).then((res) => res.json())
  }

  // registerUserDB(params: { userName: string; password: string }) {
  //   // const { userName, password } = params
  //   return fetch(
  //     `${this.performanceInsightBaseUrl}?BackMethod=RegisterUserDB&orgId=${this.orgId}&projectId=${this.projectId}&clusterId=${this.clusterId}`,
  //     {
  //       method: 'POST',
  //       headers: {
  //         token: `Bearer ${this.token}`
  //       },
  //       body: JSON.stringify(params)
  //     }
  //   ).then((res) => res.json())
  // }

  unRegisterUserDB() {
    return fetch(
      `${this.performanceInsightBaseUrl}?BackMethod=UnRegisterUserDB&clusterId=${this.clusterId}&projectId=${this.projectId}&orgId=${this.orgId}`,
      {
        headers: {
          token: `Bearer ${this.token}`
        }
      }
    ).then((res) => res.json())
  }

  registerUserDBStatusGet() {
    return fetch(
      `${this.performanceInsightBaseUrl}?BackMethod=IsTiDBOKForAdvisor&clusterId=${this.clusterId}&projectId=${this.projectId}&orgId=${this.orgId}`,
      {
        headers: {
          token: `Bearer ${this.token}`
        }
      }
    ).then((res) => res.json())
  }

  sqlValidationGet() {
    return fetch(
      `${this.performanceInsightBaseUrl}?BackMethod=CheckIfUserTiDBOK&clusterId=${this.clusterId}&projectId=${this.projectId}&orgId=${this.orgId}`,
      {
        headers: {
          token: `Bearer ${this.token}`
        }
      }
    ).then((res) => res.json())
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
