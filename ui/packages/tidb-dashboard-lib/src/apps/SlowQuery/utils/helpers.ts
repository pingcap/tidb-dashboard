import { IColumnKeys } from '@lib/components'

export const LIMITS = [100, 200, 500, 1000]

export const DEF_SLOW_QUERY_COLUMN_KEYS: IColumnKeys = {
  query: true,
  timestamp: true,
  query_time: true,
  memory_max: true
}
export const SLOW_QUERY_VISIBLE_COLUMN_KEYS = 'slow_query.visible_column_keys'
export const SLOW_QUERY_SHOW_FULL_SQL = 'slow_query.show_full_sql'
export const SLOW_DATA_LOAD_THRESHOLD = 2000
