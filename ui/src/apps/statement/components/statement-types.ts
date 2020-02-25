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

export interface StatementTimeRange {
  begin_time: string
  end_time: string
}

export interface StatementOverview {
  schema_name: string
  digest: string
  digest_text: string
  sum_latency: number
  exec_count: number
  avg_affected_rows: number
  avg_latency: number
  avg_mem: number
}

//////////////////

export interface StatementDetailInfo {
  schema_name: string
  digest: string
  digest_text: string
  sum_latency: number
  exec_count: number
  avg_affected_rows: number
  avg_total_keys: number

  query_sample_text: string
  last_seen: string
}

export interface StatementNode {
  address: string
  sum_latency: number
  exec_count: number
  avg_latency: number
  max_latency: number
  avg_mem: number
  sum_backoff_times: number
}
