import { useMemo } from 'react'
import _ from 'lodash'
import { StatementFields, StatementMaxMinVals } from './statement-types'

export function useMaxMin(fields: StatementFields[]): StatementMaxMinVals {
  return useMemo(() => {
    const maxSumLatency = _.max(fields.map((f) => f.sum_latency)) || 1
    const maxExecCount = _.max(fields.map((f) => f.exec_count)) || 1
    const maxMaxLatency = _.max(fields.map((f) => f.max_latency)) || 1
    const maxAvgLatency = _.max(fields.map((f) => f.avg_latency)) || 1
    const maxMinLatency = _.max(fields.map((f) => f.min_latency)) || 1
    const maxMaxMem = _.max(fields.map((f) => f.max_mem)) || 1
    const maxAvgMem = _.max(fields.map((f) => f.avg_mem)) || 1

    return {
      maxSumLatency,
      maxExecCount,
      maxMaxLatency,
      maxAvgLatency,
      maxMinLatency,
      maxMaxMem,
      maxAvgMem,
    }
  }, [fields])
}
