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
  fieldType: string
  isNotNull: boolean
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
    fieldType: column.Type,
    isNotNull: column.Null === 'NO',
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

export type NewColumnFieldTypeDefinition = {
  typeName: FieldTypeName
  length?: number
  decimals?: number
  isNotNull?: boolean
  isUnsigned?: boolean
}

export enum FieldTypeName {
  BIT = 'BIT',
  TINYINT = 'TINYINT',
  BOOL = 'BOOL',
  SMALLINT = 'SMALLINT',
  MEDIUMINT = 'MEDIUMINT',
  INT = 'INT',
  BIGINT = 'BIGINT',
  DECIMAL = 'DECIMAL',
  FLOAT = 'FLOAT',
  DOUBLE = 'DOUBLE',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  TIMESTAMP = 'TIMESTAMP',
  TIME = 'TIME',
  YEAR = 'YEAR',
  CHAR = 'CHAR',
  VARCHAR = 'VARCHAR',
  BINARY = 'BINARY',
  VARBINARY = 'VARBINARY',
  TINYBLOB = 'TINYBLOB',
  TINYTEXT = 'TINYTEXT',
  BLOB = 'BLOB',
  TEXT = 'TEXT',
  MEDIUMBLOB = 'MEDIUMBLOB',
  MEDIUMTEXT = 'MEDIUMTEXT',
  LONGBLOB = 'LONGBLOB',
  LONGTEXT = 'LONGTEXT',
  ENUM = 'ENUM',
  SET = 'SET',
  JSON = 'JSON',
}

export function isFieldTypeNameSupportLength(typeName: FieldTypeName) {
  return (
    [
      FieldTypeName.BIT,
      FieldTypeName.TINYINT,
      FieldTypeName.SMALLINT,
      FieldTypeName.MEDIUMINT,
      FieldTypeName.INT,
      FieldTypeName.BIGINT,
      FieldTypeName.DECIMAL,
      FieldTypeName.FLOAT,
      FieldTypeName.DOUBLE,
      FieldTypeName.DATETIME,
      FieldTypeName.TIMESTAMP,
      FieldTypeName.TIME,
      FieldTypeName.CHAR,
      FieldTypeName.VARCHAR,
      FieldTypeName.BINARY,
      FieldTypeName.VARBINARY,
      FieldTypeName.BLOB,
      FieldTypeName.TEXT,
    ].indexOf(typeName) > -1
  )
}

export function isFieldTypeNameSupportUnsigned(typeName: FieldTypeName) {
  return (
    [
      FieldTypeName.TINYINT,
      FieldTypeName.SMALLINT,
      FieldTypeName.MEDIUMINT,
      FieldTypeName.INT,
      FieldTypeName.BIGINT,
      FieldTypeName.DECIMAL,
      FieldTypeName.FLOAT,
      FieldTypeName.DOUBLE,
    ].indexOf(typeName) > -1
  )
}

export function isFieldTypeNameSupportDecimal(typeName: FieldTypeName) {
  return (
    [FieldTypeName.DECIMAL, FieldTypeName.FLOAT, FieldTypeName.DOUBLE].indexOf(
      typeName
    ) > -1
  )
}

export function isFieldTypeNameLengthRequired(typeName: FieldTypeName) {
  return [FieldTypeName.VARCHAR, FieldTypeName.VARBINARY].indexOf(typeName) > -1
}

function buildFieldTypeDefinition(def: NewColumnFieldTypeDefinition): string {
  // in case of calling from JS
  const typeName = def.typeName.toUpperCase() as FieldTypeName
  let r = typeName as string
  let dec: number[] = []
  if (def.length != null && isFieldTypeNameSupportLength(typeName)) {
    dec.push(Math.floor(def.length))
  }
  if (def.decimals != null && isFieldTypeNameSupportDecimal(typeName)) {
    dec.push(Math.floor(def.decimals))
  }
  if (dec.length === 0 && isFieldTypeNameLengthRequired(typeName)) {
    dec.push(255)
  }
  if (dec.length > 0) {
    r += ` (${dec.join(', ')})`
  }
  if (def.isUnsigned && isFieldTypeNameSupportUnsigned(typeName)) {
    r += ' UNSIGNED'
  }
  if (def.isNotNull) {
    r += ' NOT NULL'
  }
  return r
}

export type NewColumnDefinition = {
  name: string
  fieldType: NewColumnFieldTypeDefinition
  defaultValue?: string
  comment?: string
}

function buildColumnDefinition(def: NewColumnDefinition) {
  let r = SqlString.escapeId(def.name)
  r += ` ${buildFieldTypeDefinition(def.fieldType)}`
  if (def.defaultValue != null) {
    // FIXME: DEFAULT for TIME?
    r += ` DEFAULT ${SqlString.escape(def.defaultValue)}`
  }
  if (def.comment != null) {
    r += ` COMMENT ${SqlString.escape(def.comment)}`
  }
  return r
}

export async function addTableColumnAtTail(
  dbName: string,
  tableName: string,
  newColumn: NewColumnDefinition
) {
  await evalSql(`ALTER TABLE
    ${SqlString.escapeId(dbName)}.${SqlString.escapeId(tableName)}
    ADD COLUMN
    ${buildColumnDefinition(newColumn)}
  `)
}

export async function addTableColumnAtHead(
  dbName: string,
  tableName: string,
  newColumn: NewColumnDefinition
) {
  await evalSql(`ALTER TABLE
    ${SqlString.escapeId(dbName)}.${SqlString.escapeId(tableName)}
    ADD COLUMN
    ${buildColumnDefinition(newColumn)}
    FIRST
  `)
}

export async function addTableColumnAfter(
  dbName: string,
  tableName: string,
  newColumn: NewColumnDefinition,
  afterThisColumnName: string
) {
  await evalSql(`ALTER TABLE
    ${SqlString.escapeId(dbName)}.${SqlString.escapeId(tableName)}
    ADD COLUMN
    ${buildColumnDefinition(newColumn)}
    AFTER
    ${SqlString.escapeId(afterThisColumnName)}
  `)
}

export async function dropTableColumn(
  dbName: string,
  tableName: string,
  columnName: string
) {
  await evalSql(`ALTER TABLE
    ${SqlString.escapeId(dbName)}.${SqlString.escapeId(tableName)}
    DROP COLUMN
    ${SqlString.escapeId(columnName)}
  `)
}

export type AddIndexOptionsColumn = {
  columnName: string

  // Optional, mostly it will be null or 0. Setting keyLength for inappropiate
  // columns will result in errors.
  keyLength?: number
}

export type AddIndexOptions = {
  name: string // Index name
  type: TableInfoIndexType // Must not be PRIMARY
  columns: AddIndexOptionsColumn[]
}

export async function addTableIndex(
  dbName: string,
  tableName: string,
  options: AddIndexOptions
) {
  if (options.type === TableInfoIndexType.Primary) {
    throw new Error('Add PRIMARY index is not supported')
  }

  const keys = options.columns.map((col) => {
    let k = SqlString.escapeId(col.columnName)
    if (col.keyLength && col.keyLength > 0) {
      k += `(${col.keyLength})`
    }
    return k
  })

  let indexTypeName
  if (options.type === TableInfoIndexType.Normal) {
    indexTypeName = ''
  } else {
    indexTypeName = 'UNIQUE'
  }

  await evalSql(`
    CREATE ${indexTypeName} INDEX ${SqlString.escapeId(options.name)} ON
    ${SqlString.escapeId(dbName)}.${SqlString.escapeId(tableName)}
    (${keys.join(', ')})
  `)
}

export async function dropTableIndex(
  dbName: string,
  tableName: string,
  indexName: string
) {
  await evalSql(`
    DROP INDEX ${SqlString.escapeId(indexName)} ON
    ${SqlString.escapeId(dbName)}.${SqlString.escapeId(tableName)}
  `)
}
