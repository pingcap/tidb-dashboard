import { IColumnKeys } from '@lib/components'

export const LIMITS = [100, 200, 500, 1000]

export const DEF_SLOW_QUERY_COLUMN_KEYS: IColumnKeys = {
  query: true,
  timestamp: true,
  query_time: true,
  memory_max: true
}
