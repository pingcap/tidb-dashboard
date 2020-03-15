export interface Instance {
  uuid: string
  name: string
}

export type StatementStatus = 'on' | 'off' | 'unknown'

export interface StatementConfig {
  refresh_interval: number
  keep_duration: number
  max_sql_count: number
  max_sql_length: number
}

//////////////////
import {
  StatementTimeRange as D_StatementTimeRange,
  StatementOverview as D_StatementOverview,
  StatementNode as D_StatementNode,
  StatementDetail as D_SattementDetail,
  StatementPlan as D_StatementPlan,
} from '@pingcap-incubator/dashboard_client'

export type StatementTimeRange = D_StatementTimeRange
export type StatementOverview = D_StatementOverview
export type StatementDetailInfo = D_SattementDetail
export type StatementNode = D_StatementNode
export type StatementPlan = D_StatementPlan

export interface StatementPlanStep {
  id: string
  task: string
  estRows: number
  operator_info: string
}
