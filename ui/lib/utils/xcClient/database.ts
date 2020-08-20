import { executeStatements } from './util'

export type GetDatabaseResult = {
  databases: string[]
}

export async function getDatabases(): Promise<GetDatabaseResult> {
  const data = await executeStatements(`SHOW DATABASES`)
  const ret: string[] = []
  for (const row of data.rows ?? []) {
    ret.push((row[0] as unknown) as string)
  }
  return {
    databases: ret,
  }
}
