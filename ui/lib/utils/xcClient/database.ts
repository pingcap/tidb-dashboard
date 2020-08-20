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

export type GetTableResult = {
  tables: string[]
}

export async function getTables(dbName: string): Promise<GetTableResult> {
  const data = await executeStatements(
    `USE ${SqlString.escapeId(dbName)}; SHOW TABLES;`
  )
  const ret: string[] = []
  for (const row of data.rows ?? []) {
    ret.push((row[0] as unknown) as string)
  }
  return {
    tables: ret,
  }
}

export async function renameTable(
  dbName: string,
  oldTableName: string,
  newTableName: string
) {
  await executeStatements(`
    USE ${SqlString.escapeId(dbName)};
    RENAME TABLE ${SqlString.escapeId(oldTableName)} TO ${SqlString.escapeId(
    newTableName
  )};
  `)
}

export async function dropTable(dbName: string, tableName: string) {
  await executeStatements(
    `DROP TABLE ${SqlString.escapeId(dbName)}.${SqlString.escapeId(tableName)}`
  )
}
