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

export interface Statement {
  sql_category: string
  total_duration: number
  total_times: number
  avg_affect_lines: number
  avg_duration: number
  avg_cost_mem: number
}

//////////////////

export interface StatementSummary {
  sql_category: string
  last_sql: string
  last_time: string
  schemas: string[]
}

export interface StatementStatis {
  total_duration: number
  total_times: number
  avg_affect_lines: number
  avg_scan_lines: number
}

export interface StatementNode {
  node_name: string
  total_duration: number
  total_times: number
  avg_duration: number
  max_duration: number
  avg_cost_mem: number
  back_off_times: number
}

export interface StatementDetailInfo {
  summary: StatementSummary
  statis: StatementStatis
  nodes: StatementNode[]
}
