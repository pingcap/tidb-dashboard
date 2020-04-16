export interface Instance {
  uuid: string
  name: string
}

export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

export type StatementStatus = 'on' | 'off' | 'unknown'

export interface StatementConfig {
  refresh_interval: number
  keep_duration: number
  max_sql_count: number
  max_sql_length: number
}

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
  max_latency?: number
  avg_latency?: number
  min_latency?: number
  max_mem?: number
  avg_mem?: number
}

export interface StatementMaxVals {
  maxSumLatency: number
  maxExecCount: number
  maxMaxLatency: number
  maxAvgLatency: number
  maxMinLatency: number
  maxMaxMem: number
  maxAvgMem: number
}
