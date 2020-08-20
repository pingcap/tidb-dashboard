import { evalSql, evalSqlObj } from './util'
import SqlString from 'sqlstring'
import _ from 'lodash'

export type GetDatabasesResult = {
  databases: string[]
}

export async function getDatabases(): Promise<GetDatabasesResult> {
  const data = await evalSql(`SHOW DATABASES`)
  const ret: string[] = []
  for (const row of data.rows ?? []) {
    ret.push((row[0] as unknown) as string)
  }
  return {
    databases: ret,
  }
}

export async function createDatabase(name: string) {
  await evalSql(`CREATE DATABASE ${SqlString.escapeId(name)}`)
}

export async function dropDatabase(name: string) {
  await evalSql(`DROP DATABASE ${SqlString.escapeId(name)}`)
}

export type GetTablesResult = {
  tables: string[]
}

export async function getTables(dbName: string): Promise<GetTablesResult> {
  const data = await evalSql(`USE ${SqlString.escapeId(dbName)}; SHOW TABLES;`)
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
  await evalSql(`
    USE ${SqlString.escapeId(dbName)};
    RENAME TABLE ${SqlString.escapeId(oldTableName)} TO ${SqlString.escapeId(
    newTableName
  )};
  `)
}

export async function dropTable(dbName: string, tableName: string) {
  await evalSql(
    `DROP TABLE ${SqlString.escapeId(dbName)}.${SqlString.escapeId(tableName)}`
  )
}

export type TableInfoColumn = {
  name: string
  isNullable: boolean
  defaultValue: string | null
  comment: string
}

export enum TableInfoIndexType {
  Normal,
  Unique,
  Primary,
}

export type TableInfoIndex = {
  name: string
  type: TableInfoIndexType
  columns: string[]
  isDeleteble: boolean // Primary index is not deleteble. For isDeleteble==false, do not show a delete icon
}

export type GetTableInfoResult = {
  columns: TableInfoColumn[]
  indexes: TableInfoIndex[]
}

export async function getTableInfo(
  dbName: string,
  tableName: string
): Promise<GetTableInfoResult> {
  const name = `${SqlString.escapeId(dbName)}.${SqlString.escapeId(tableName)}`
  const columnsData = await evalSqlObj(`SHOW FULL COLUMNS FROM ${name}`)
  const columns = columnsData.map((column) => ({
    name: column.Field,
    type: column.Type,
    isNullable: column.Null === 'YES',
    defaultValue: column.Default,
    comment: column.Comment,
  }))

  const indexesData = await evalSqlObj(`SHOW INDEX FROM ${name}`)
  const indexesByName = _.groupBy(indexesData, 'Key_name')
  const indexes: TableInfoIndex[] = []

  for (const indexName in indexesByName) {
    const meta = indexesByName[indexName][0]
    let type
    if (indexName.toUpperCase().trim() === 'PRIMARY') {
      type = TableInfoIndexType.Primary
    } else if (Number(meta.Non_unique) === 1) {
      type = TableInfoIndexType.Normal
    } else {
      type = TableInfoIndexType.Unique
    }
    const columns = indexesByName[indexName].map((item) => item.Column_name)
    indexes.push({
      name: indexName,
      type,
      columns,
      isDeleteble: type !== TableInfoIndexType.Primary,
    })
  }
  return {
    columns,
    indexes,
  }
}
