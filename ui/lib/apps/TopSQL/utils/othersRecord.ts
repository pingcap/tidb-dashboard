import { TopsqlCPUTimeItem } from '@lib/client'
import { SQLRecord } from '../pages/List/ListTable'

const OTHERS_LABEL = '(Others)'

export function convertOthersRecord(r: TopsqlCPUTimeItem) {
  if (!!r.sql_digest) {
    return
  }
  r.sql_digest = OTHERS_LABEL
  r.sql_text = OTHERS_LABEL
}

export function isOthersRecord(r: SQLRecord) {
  return r.digest === OTHERS_LABEL
}
