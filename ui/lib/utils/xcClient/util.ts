import client, { QueryeditorRunResponse } from '@lib/client'

export async function executeStatements(
  statements: string,
  maxRows?: number
): Promise<QueryeditorRunResponse> {
  const r = await client.getInstance().queryEditorRun({
    statements: statements,
    max_rows: maxRows ?? 2000,
  })
  if (r?.data?.error_msg) {
    throw new Error(r.data.error_msg)
  }
  return r.data
}
