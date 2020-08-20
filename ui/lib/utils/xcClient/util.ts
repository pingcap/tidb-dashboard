import client, { QueryeditorRunResponse } from '@lib/client'
import _ from 'lodash'

export async function evalSql(
  statements: string,
  maxRows?: number
): Promise<QueryeditorRunResponse> {
  console.log('Evaluate SQL', statements)
  const r = await client.getInstance().queryEditorRun({
    statements: statements,
    max_rows: maxRows ?? 2000,
  })
  if (r?.data?.error_msg) {
    throw new Error(r.data.error_msg)
  }
  return r.data
}

export async function evalSqlObj(
  statements: string,
  maxRows?: number
): Promise<any[]> {
  const r = await evalSql(statements, maxRows)
  return r.rows?.map((row) => _.zipObject(r.column_names ?? [], row)) ?? []
}
