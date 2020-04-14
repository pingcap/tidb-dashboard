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

export {
  StatementTimeRange,
  StatementOverview,
  StatementNode,
  StatementDetail as StatementDetailInfo,
  StatementPlan,
} from '@pingcap-incubator/dashboard_client'

export interface StatementPlanStep {
  id: string
  task: string
  estRows: number
  operator_info: string
}

//////////////////

export interface StatementFields {
  sum_latency?: number
  exec_count?: number
  avg_latency?: number
  max_latency?: number
  avg_mem?: number
}

export interface StatementMaxMinVals {
  maxSumLatency: number
  maxExecCount: number
  maxAvgLatency: number
  maxMaxLatency: number
  maxAvgMem: number
}
