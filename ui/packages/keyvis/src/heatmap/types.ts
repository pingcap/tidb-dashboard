import {
  DecoratorLabelKey,
  MatrixMatrix,
} from '@pingcap-incubator/dashboard_client'

export type KeyAxisEntry = DecoratorLabelKey
export type HeatmapData = MatrixMatrix

export type DataTag =
  | 'integration'
  | 'written_bytes'
  | 'read_bytes'
  | 'written_keys'
  | 'read_keys'

export type HeatmapRange = {
  starttime?: number
  endtime?: number
  startkey?: string
  endkey?: string
}
