import { TopsqlSummaryItem, TopsqlSummaryPlanItem } from '@lib/client'
import { PlanRecord } from '../pages/List/ListDetail/ListDetailTable'
import { SQLRecord } from '../pages/List/ListTable'

const OTHERS_LABEL = '(Others)'

export function convertOthersRecord(r: TopsqlSummaryItem) {
  if (!!r.sql_digest) {
    return
  }
  r.sql_digest = OTHERS_LABEL
  r.sql_text = OTHERS_LABEL
}

export function isOthersRecord(r: SQLRecord) {
  return r.digest === OTHERS_LABEL
}

export function convertOthersPlanRecord(r: TopsqlSummaryPlanItem) {
  if (!!r.plan_digest) {
    return
  }
  r.plan_text = OTHERS_LABEL
  r.plan_digest = OTHERS_LABEL
}

export function isOthersPlanRecord(r: PlanRecord) {
  return r.plan_digest === OTHERS_LABEL
}
