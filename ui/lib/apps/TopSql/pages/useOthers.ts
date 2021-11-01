// import { CentralTopSQLDigestCPUTimeRecord } from 'apiClient'

export const OTHERS_LABEL = 'Others'

// export function convertOthersRecord(data: CentralTopSQLDigestCPUTimeRecord) {
export function convertOthersRecord(data: any) {
  if (!data.is_others) {
    return
  }
  data.sql_digest = OTHERS_LABEL
  data.sql_text = OTHERS_LABEL
}
