import { executeStatements } from './util'
import SqlString from 'sqlstring'

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

export async function createDatabase(name: string) {
  await executeStatements(`CREATE DATABASE ${SqlString.escapeId(name)}`)
}

export async function dropDatabase(name: string) {
  await executeStatements(`DROP DATABASE ${SqlString.escapeId(name)}`)
}
