// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

import type { PlanRecord } from '../pages/List/ListDetail/ListDetailTable'
import type { SQLRecord } from '../pages/List/ListTable'

const OVERALL_IDENTIFIER = '__OVERALL_IDENTIFIER__'

export const isOverallRecord = (r: PlanRecord) => {
  return r.plan_digest === OVERALL_IDENTIFIER
}

export const createOverallRecord = (records: PlanRecord[]) => {
  return records.reduce(
    (prev, current) => {
      prev.cpuTime += current.cpuTime
      prev.exec_count_per_sec! += current.exec_count_per_sec || 0
      prev.scan_records_per_sec! += current.scan_records_per_sec || 0
      prev.scan_indexes_per_sec! += current.scan_indexes_per_sec || 0
      prev.duration_per_exec_ms! += current.duration_per_exec_ms || 0
      return prev
    },
    {
      plan_digest: OVERALL_IDENTIFIER,
      cpuTime: 0,
      exec_count_per_sec: 0,
      scan_records_per_sec: 0,
      scan_indexes_per_sec: 0,
      duration_per_exec_ms: 0,
    } as PlanRecord
  )
}

export const isOthersRecord = (r: SQLRecord) => {
  return r.is_other
}

export const isOthersDigest = (d: string) => !d

const NO_PLAN_IDENTIFIER = '__NO_PLAN_IDENTIFIER__'

export const convertNoPlanRecord = (r: PlanRecord) => {
  const _r = { ...r }
  if (isNoPlanRecord(_r)) {
    _r.plan_digest = NO_PLAN_IDENTIFIER
  }
  return _r
}

export const isNoPlanRecord = (r: PlanRecord) => {
  return !r.plan_digest || r.plan_digest === NO_PLAN_IDENTIFIER
}

export const isUnknownSQLRecord = (r: SQLRecord) => {
  return !r.sql_text && !r.is_other
}
