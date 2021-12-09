import { TopsqlCPUTimeItem } from '@lib/client'

export const OTHERS_LABEL = 'Others'

export function convertOthersRecord(data: TopsqlCPUTimeItem) {
  if (!!data.sql_digest) {
    return
  }
  data.sql_digest = OTHERS_LABEL
  data.sql_text = OTHERS_LABEL
}
