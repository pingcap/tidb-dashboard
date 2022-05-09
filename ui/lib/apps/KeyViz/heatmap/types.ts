import { DecoratorLabelKey, MatrixMatrix } from '@lib/client'

export type KeyAxisEntry = DecoratorLabelKey
export type HeatmapData = MatrixMatrix

export type DataTag =
  | 'integration'
  | 'written_bytes'
  | 'read_bytes'
  | 'written_keys'
  | 'read_keys'
  | `write_query_num`
  | `read_query_num`

export type HeatmapRange = {
  starttime?: number
  endtime?: number
  startkey?: string
  endkey?: string
}
