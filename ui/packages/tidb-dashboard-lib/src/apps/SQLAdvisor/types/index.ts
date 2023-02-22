export interface TuningDetailProps {
  analyzed_time: string
  checked_time: number
  id: number
  impact: string
  insight_type: string
  plan: string
  plan_digest: string
  sql_digest: string
  sql_statement: string
  suggested_command: {
    cmd_explanation: {
      table_name: string
      fields: string[]
    }
    suggestion_key: string
    params: string[]
  }[]
  table_clauses: {
    table_name: string
    where_clause: string[]
    selected_fields: null
    index_list: {
      table_name: string
      columns: string
      index_name: string
      clusterd: true
      visible: true
    }[]
  }[]
  table_healthies: {
    table_name: string
    healthy: string
    analyzed_time: string
  }[]
  use_Stats: boolean
  use_index: boolean
}

export interface SQLTunedListProps {
  tuned_results: TuningDetailProps[]
  count: number
}

export type TuningTaskStatus = boolean
