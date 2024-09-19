// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

import type { PlanRecord } from '../pages/List/ListDetail/ListDetailTable'
import type { SQLRecord } from '../pages/List/ListTable'

const OVERALL_IDENTIFIER = '__OVERALL_IDENTIFIER__'

export const isOverallRecord = (r: PlanRecord) => {
  return r.plan_digest === OVERALL_IDENTIFIER
}

export const createOverallRecord = (record: SQLRecord): PlanRecord => {
  return {
    plan_digest: OVERALL_IDENTIFIER,
    cpuTime: record.cpu_time_ms || 0,
    exec_count_per_sec: record.exec_count_per_sec,
    scan_records_per_sec: record.scan_records_per_sec,
    scan_indexes_per_sec: record.scan_indexes_per_sec,
    duration_per_exec_ms: record.duration_per_exec_ms
  }
}

export const isOthersRecord = (r: SQLRecord) => {
  return r.is_other || r.text === 'other'
}

export const isSummaryByRecord = (r: SQLRecord) => {
  return (r.text?.length ?? 0) > 0
}

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
