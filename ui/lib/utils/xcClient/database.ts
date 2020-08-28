import { evalSql, evalSqlObj } from './util'
import SqlString from 'sqlstring'
import _ from 'lodash'

function eid(n: string): string {
  return SqlString.escapeId(n, true)
}

function e(n: any): string {
  return SqlString.escape(n)
}

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
  await evalSql(`CREATE DATABASE ${eid(name)}`)
}

export async function dropDatabase(name: string) {
  await evalSql(`DROP DATABASE ${eid(name)}`)
}

export enum TableType {
  SYSTEM_VIEW = 'SYSTEM VIEW',
  TABLE = 'BASE TABLE',
  VIEW = 'VIEW',
}

export type TableInfo = {
  name: string
  type: TableType
  createTime: string
  collation: string
  comment: string
}

export type GetTablesResult = {
  tables: TableInfo[]
}

export async function getTables(
  dbName: string,
  tableName?: string
): Promise<GetTablesResult> {
  let sql = `
  SELECT
    TABLE_NAME, TABLE_TYPE, CREATE_TIME, TABLE_COLLATION, TABLE_COMMENT
  FROM
    INFORMATION_SCHEMA.TABLES
  WHERE UPPER(TABLE_SCHEMA) = ?
`
  let params = [dbName.toUpperCase()]
  if ((tableName?.length ?? 0) > 0) {
    sql += ` AND UPPER(TABLE_NAME) = ?`
    params.push(tableName!.toUpperCase())
  }
  const data = await evalSqlObj(SqlString.format(sql, params))

  return {
    tables: data.map((row) => ({
      name: row.TABLE_NAME,
      type: row.TABLE_TYPE,
      createTime: row.CREATE_TIME,
      collation: row.TABLE_COLLATION,
      comment: row.TABLE_COMMENT,
    })),
  }
}

export async function renameTable(
  dbName: string,
  oldTableName: string,
  newTableName: string
) {
  await evalSql(`
    USE ${eid(dbName)};
    RENAME TABLE ${eid(oldTableName)} TO ${eid(newTableName)};
  `)
}

export async function dropTable(dbName: string, tableName: string) {
  await evalSql(`DROP TABLE ${eid(dbName)}.${eid(tableName)}`)
}

export async function dropView(dbName: string, tableName: string) {
  await evalSql(`DROP VIEW ${eid(dbName)}.${eid(tableName)}`)
}

// Warning: highly unsafe!
export async function createView(
  dbName: string,
  tableName: string,
  viewDef: string
) {
  await evalSql(
    `USE ${eid(dbName)};
    CREATE VIEW ${eid(tableName)}
    AS ${viewDef};`
  )
}

export type TableInfoColumn = {
  name: string
  fieldType: string
  isNotNull: boolean
  canBeEmpty: boolean
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
  info: TableInfo
  viewDefinition?: string
  columns: TableInfoColumn[]
  indexes: TableInfoIndex[]
  partition?: PartitionBy
}

export async function getTableInfo(
  dbName: string,
  tableName: string
): Promise<GetTableInfoResult> {
  let info: TableInfo
  {
    const d = await getTables(dbName, tableName)
    if (d.tables.length === 0) {
      throw new Error(`Table ${dbName}.${tableName} not found`)
    }
    info = d.tables[0]
  }
  let viewDefinition: string | undefined
  if (info.type === TableType.VIEW) {
    const d = await evalSqlObj(
      SqlString.format(
        `
      SELECT
        VIEW_DEFINITION
      FROM
        INFORMATION_SCHEMA.VIEWS
      WHERE UPPER(TABLE_SCHEMA) = ? AND UPPER(TABLE_NAME) = ?`,
        [dbName.toUpperCase(), tableName.toUpperCase()]
      )
    )
    if (d.length > 0) {
      viewDefinition = d[0].VIEW_DEFINITION
    }
  }

  const name = `${eid(dbName)}.${eid(tableName)}`
  const columnsData = await evalSqlObj(`SHOW FULL COLUMNS FROM ${name}`)

  const columns = columnsData.map((column) => {
    const canBeEmpty = isFieldTypeNameAcceptEmptyContent(
      (column.TYPE ?? '').toUpperCase().split('(')[0]
    )

    return {
      name: column.FIELD,
      fieldType: column.TYPE,
      isNotNull: column.NULL === 'NO',
      canBeEmpty,
      defaultValue: column.DEFAULT,
      comment: column.COMMENT,
    }
  })

  const indexesData = await evalSqlObj(`SHOW INDEX FROM ${name}`)
  const indexesByName = _.groupBy(indexesData, 'KEY_NAME')
  const indexes: TableInfoIndex[] = []

  for (const indexName in indexesByName) {
    const meta = indexesByName[indexName][0]
    let type
    if (indexName.toUpperCase().trim() === 'PRIMARY') {
      type = TableInfoIndexType.Primary
    } else if (Number(meta.NON_UNIQUE) === 1) {
      type = TableInfoIndexType.Normal
    } else {
      type = TableInfoIndexType.Unique
    }
    const columns = indexesByName[indexName].map((item) => item.COLUMN_NAME)
    indexes.push({
      name: indexName,
      type,
      columns,
      isDeleteble: type !== TableInfoIndexType.Primary,
    })
  }

  let partition: PartitionBy | undefined
  {
    const d = await evalSqlObj(
      SqlString.format(
        `
      SELECT
        PARTITION_METHOD, PARTITION_NAME, PARTITION_EXPRESSION, PARTITION_DESCRIPTION
      FROM
        INFORMATION_SCHEMA.PARTITIONS
      WHERE UPPER(TABLE_SCHEMA) = ? AND UPPER(TABLE_NAME) = ?
      ORDER BY PARTITION_ORDINAL_POSITION`,
        [dbName.toUpperCase(), tableName.toUpperCase()]
      )
    )
    if (d.length > 0) {
      switch (d[0].PARTITION_METHOD) {
        case 'LIST': {
          let p: PartitionByListDefinition = {
            type: PartitionType.LIST,
            expr: d[0].PARTITION_EXPRESSION,
            partitions: d.map((partition) => {
              return {
                name: partition.PARTITION_NAME,
                values: partition.PARTITION_DESCRIPTION,
              }
            }),
          }
          partition = p
          break
        }
        case 'HASH': {
          let p: PartitionByHashDefinition = {
            type: PartitionType.HASH,
            expr: d[0].PARTITION_EXPRESSION,
            numberOfPartitions: d.length,
          }
          partition = p
          break
        }
        case 'RANGE': {
          let p: PartitionByRangeDefinition = {
            type: PartitionType.RANGE,
            expr: d[0].PARTITION_EXPRESSION,
            partitions: d.map((partition) => {
              return {
                name: partition.PARTITION_NAME,
                boundaryValue:
                  partition.PARTITION_DESCRIPTION === 'MAXVALUE'
                    ? undefined
                    : partition.PARTITION_DESCRIPTION,
              }
            }),
          }
          partition = p
          break
        }
      }
    }
  }

  return {
    info,
    viewDefinition,
    columns,
    indexes,
    partition,
  }
}

// Only RANGE and LIST partition can be dropped
export async function dropPartition(
  dbName: string,
  tableName: string,
  partitionName: string
) {
  await evalSql(`
  ALTER TABLE
    ${eid(dbName)}.${eid(tableName)}
  DROP PARTITION ${eid(partitionName)}
  `)
}

export async function addRangePartition(
  dbName: string,
  tableName: string,
  newPartition: RangePartitionDefinition
) {
  await evalSql(`
  ALTER TABLE
    ${eid(dbName)}.${eid(tableName)}
  ADD PARTITION (
    ${buildRangePartitionStatement(newPartition)}
  )
  `)
}

export async function addListPartition(
  dbName: string,
  tableName: string,
  newPartition: ListPartitionDefinition
) {
  await evalSql(`
  ALTER TABLE
    ${eid(dbName)}.${eid(tableName)}
  ADD PARTITION (
    ${buildListPartitionStatement(newPartition)}
  )
  `)
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
  // FIXME: Support ENUM and SET
  // ENUM = 'ENUM',
  // SET = 'SET',
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

export function isFieldTypeNameSupportAutoIncrement(typeName: FieldTypeName) {
  return (
    [
      FieldTypeName.TINYINT,
      FieldTypeName.SMALLINT,
      FieldTypeName.MEDIUMINT,
      FieldTypeName.INT,
      FieldTypeName.BIGINT,
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

export function isFieldTypeNameAcceptEmptyContent(typeName: FieldTypeName) {
  return (
    [
      FieldTypeName.CHAR,
      FieldTypeName.VARCHAR,
      FieldTypeName.BINARY,
      FieldTypeName.VARBINARY,
      FieldTypeName.TINYBLOB,
      FieldTypeName.TINYTEXT,
      FieldTypeName.BLOB,
      FieldTypeName.TEXT,
      FieldTypeName.MEDIUMBLOB,
      FieldTypeName.MEDIUMTEXT,
      FieldTypeName.LONGBLOB,
      FieldTypeName.LONGTEXT,
    ].indexOf(typeName) > -1
  )
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
  isAutoIncrement?: boolean // Note: This is respected only in CREATE TABLE.
  defaultValue?: string
  comment?: string
}

function buildColumnDefinition(
  def: NewColumnDefinition,
  respectAutoIncrement?: boolean
): string {
  let r = eid(def.name)
  r += ` ${buildFieldTypeDefinition(def.fieldType)}`
  if (
    respectAutoIncrement &&
    isFieldTypeNameSupportAutoIncrement(def.fieldType.typeName) &&
    def.isAutoIncrement
  ) {
    r += ` AUTO_INCREMENT`
  }
  if (def.defaultValue != null) {
    // FIXME: DEFAULT for TIME?
    r += ` DEFAULT ${e(def.defaultValue)}`
  }
  if (def.comment != null) {
    r += ` COMMENT ${e(def.comment)}`
  }
  return r
}

export async function addTableColumnAtTail(
  dbName: string,
  tableName: string,
  newColumn: NewColumnDefinition
) {
  await evalSql(`ALTER TABLE
    ${eid(dbName)}.${eid(tableName)}
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
    ${eid(dbName)}.${eid(tableName)}
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
    ${eid(dbName)}.${eid(tableName)}
    ADD COLUMN
    ${buildColumnDefinition(newColumn)}
    AFTER
    ${eid(afterThisColumnName)}
  `)
}

export async function dropTableColumn(
  dbName: string,
  tableName: string,
  columnName: string
) {
  await evalSql(`ALTER TABLE
    ${eid(dbName)}.${eid(tableName)}
    DROP COLUMN
    ${eid(columnName)}
  `)
}

export type AddIndexOptionsColumn = {
  columnName: string

  // Optional, mostly it will be null or 0. Setting keyLength for inappropiate
  // columns will result in errors.
  keyLength?: number
}

function buildIndexDefinition(col: AddIndexOptionsColumn): string {
  let k = eid(col.columnName)
  if (col.keyLength && col.keyLength > 0) {
    k += `(${col.keyLength})`
  }
  return k
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

  const keys = options.columns.map((col) => buildIndexDefinition(col))

  let indexTypeName
  if (options.type === TableInfoIndexType.Normal) {
    indexTypeName = ''
  } else {
    indexTypeName = 'UNIQUE'
  }

  await evalSql(`
    CREATE ${indexTypeName} INDEX ${eid(options.name)} ON
    ${eid(dbName)}.${eid(tableName)}
    (${keys.join(', ')})
  `)
}

export async function dropTableIndex(
  dbName: string,
  tableName: string,
  indexName: string
) {
  await evalSql(`
    DROP INDEX ${eid(indexName)} ON
    ${eid(dbName)}.${eid(tableName)}
  `)
}

export enum PartitionType {
  RANGE = 'RANGE',
  HASH = 'HASH',
  LIST = 'LIST',
}

export type RangePartitionDefinition = {
  name: string

  // If LESS THAN MAXVALUE, supply NULL in this field.
  boundaryValue?: string
}

export type PartitionByRangeDefinition = {
  type: PartitionType.RANGE
  expr: string
  partitions: RangePartitionDefinition[]
}

export type PartitionByHashDefinition = {
  type: PartitionType.HASH
  expr: string
  numberOfPartitions: number
}

export type ListPartitionDefinition = {
  name: string
  values: string // e.g. "1, 2", or "5, null"
}

export type PartitionByListDefinition = {
  type: PartitionType.LIST
  expr: string
  partitions: ListPartitionDefinition[]
}

export type PartitionBy =
  | PartitionByRangeDefinition
  | PartitionByHashDefinition
  | PartitionByListDefinition

export type CreateTableOptions = {
  dbName: string
  tableName: string
  comment?: string
  columns: NewColumnDefinition[]
  primaryKeys?: AddIndexOptionsColumn[]
  partition?: PartitionBy
}

function buildRangePartitionStatement(p: RangePartitionDefinition): string {
  let l = `PARTITION ${eid(p.name)} VALUES `
  if (p.boundaryValue != null) {
    return l + `LESS THAN (${p.boundaryValue})`
  } else {
    return l + `LESS THAN MAXVALUE`
  }
}

function buildListPartitionStatement(p: ListPartitionDefinition): string {
  return `PARTITION ${eid(p.name)} VALUES IN (${p.values})`
}

// WARN: Supplying partition expr is dangerous
export async function createTable(options: CreateTableOptions) {
  let items: string[] = []
  for (const col of options.columns) {
    items.push(buildColumnDefinition(col, true))
  }
  if ((options.primaryKeys?.length ?? 0) > 0) {
    items.push(
      `PRIMARY KEY (` +
        options.primaryKeys!.map((k) => buildIndexDefinition(k)).join(', ') +
        `)`
    )
  }

  const id = [options.dbName, options.tableName].map((n) => eid(n)).join('.')

  let sql = `CREATE TABLE ${id} (
    ${items.join(', \n')}
  )`
  if (options.comment) {
    sql += ' COMMENT = ' + e(options.comment)
  }

  if (options.partition != null) {
    switch (options.partition.type) {
      case PartitionType.RANGE:
        {
          const pDef = _.sortBy(
            [...options.partition.partitions],
            (partition) => {
              if (partition.boundaryValue == null) {
                return Number.MAX_SAFE_INTEGER
              } else {
                return partition.boundaryValue!
              }
            }
          ).map(buildRangePartitionStatement)
          sql += ` PARTITION BY RANGE(${options.partition.expr}) (
            ${pDef.join(',\n')}
          )`
        }
        break
      case PartitionType.HASH:
        {
          sql += ` PARTITION BY HASH(${options.partition.expr}) PARTITIONS ${options.partition.numberOfPartitions}`
        }
        break
      case PartitionType.LIST:
        {
          const pDef = options.partition.partitions.map(
            buildListPartitionStatement
          )
          sql += ` PARTITION BY LIST(${options.partition.expr}) (
            ${pDef.join(',\n')}
          )`
        }
        break
      default:
        throw new Error('Unsupported partition')
    }
  }

  await evalSql(sql)
}

// FIXME: handle Binary
export type Datum = string | null

export type UpdateHandleWhereColumn = {
  columnName: string
  columnValue: Datum
}

export type UpdateHandle = {
  whereColumns: UpdateHandleWhereColumn[]
}

const SelectRowsPerPage = 1000

export type SelectTableResult = {
  columns: TableInfoColumn[]
  rows: Datum[][]

  isUpdatable: boolean
  // When a table can be updated or deleted, a handle will be given for
  // each row. Pass this handle to `updateTable` or `deleteTable` to
  // specify which row to update.
  handles?: UpdateHandle[]

  // In some rare cases, we cannot safely provide pagination.
  isPaginationUnavailable: boolean
  // When pagination is not available, we only display first N rows. This field
  // indicate all number of rows available.
  allRowsBeforeTruncation?: number
}

export async function selectTableRow(
  dbName: string,
  tableName: string,
  // page0 starts from 0
  page0: number
): Promise<SelectTableResult> {
  // To keep result stable, there will be a sorting.
  // For tables have PK, sort by PK. Otherwise, sort by _tidb_rowid
  const tableInfo = await getTableInfo(dbName, tableName)
  let primaryIndex: TableInfoIndex | null = null
  for (const index of tableInfo.indexes) {
    if (index.type === TableInfoIndexType.Primary) {
      primaryIndex = index
      break
    }
  }

  const columnNames: string[] = []
  for (const column of tableInfo.columns) {
    columnNames.push(column.name.toUpperCase())
  }
  if (primaryIndex == null) {
    columnNames.push('_tidb_rowid'.toUpperCase())
  }
  const columnNamesEscaped = columnNames.map((n) => eid(n))
  const columnIndexByName = {}
  for (let i = 0; i < columnNames.length; i++) {
    columnIndexByName[columnNames[i]] = i
  }

  const orderBy: string[] = []
  if (primaryIndex != null) {
    for (const indexColumn of primaryIndex.columns) {
      orderBy.push(indexColumn.toUpperCase())
    }
  } else {
    orderBy.push('_tidb_rowid'.toUpperCase())
  }
  const orderByEscaped = orderBy.map((n) => eid(n))

  try {
    const data = await evalSql(`
    SELECT
      ${columnNamesEscaped.join(', ')}
    FROM
      ${eid(dbName)}.${eid(tableName)}
    ORDER BY
      ${orderByEscaped.join(', ')}
    LIMIT
      ${(page0 || 0) * SelectRowsPerPage}, ${SelectRowsPerPage}
    `)

    const handles = (data.rows ?? []).map((row) => {
      const whereColumns = orderBy.map((column) => {
        return {
          columnName: column,
          columnValue: (row[columnIndexByName[column]] as any) as Datum,
        }
      })
      return {
        whereColumns,
      }
    })

    const visibleColumnsLen = tableInfo.columns.length

    return {
      columns: tableInfo.columns,
      rows: (data.rows ?? []).map((row) =>
        row.slice(0, visibleColumnsLen)
      ) as any,
      isUpdatable: true,
      handles,
      isPaginationUnavailable: false,
    }
  } catch (e) {
    if (e.message.indexOf(`Unknown column '_tidb_rowid'`) > -1) {
      // _tidb_rowid column is not available. This might be a system table. Do not project it or order by it.

      // No order by and no limit
      columnNamesEscaped.length = columnNamesEscaped.length - 1
      const data = await evalSql(`
        SELECT
          ${columnNamesEscaped.join(', ')}
        FROM
          ${eid(dbName)}.${eid(tableName)}
      `)

      return {
        columns: tableInfo.columns,
        rows: (data.rows ?? []) as any,
        isUpdatable: false,
        isPaginationUnavailable: true,
        allRowsBeforeTruncation: data.actual_rows,
      }
    } else {
      throw e
    }
  }
}

export type UpdateColumnSpec = {
  columnName: string
  value: Datum
}

function buildWhereStatementFromUpdateHandle(handle: UpdateHandle) {
  const where: string[] = []
  for (const c of handle.whereColumns) {
    where.push(`${eid(c.columnName)} = ${e(c.columnValue)}`)
  }
  return where.join(' AND ')
}

export async function updateTableRow(
  dbName: string,
  tableName: string,
  handle: UpdateHandle,
  // Some columns may be not touched or updatable.
  columnsToUpdate: UpdateColumnSpec[]
) {
  const updates: string[] = []
  for (const c of columnsToUpdate) {
    updates.push(`${eid(c.columnName)} = ${e(c.value)}`)
  }

  const whereStatement = buildWhereStatementFromUpdateHandle(handle)
  await evalSql(`
  UPDATE
    ${eid(dbName)}.${eid(tableName)}
  SET
    ${updates.join(', ')}
  WHERE
    ${whereStatement}
  `)
}

export async function deleteTableRow(
  dbName: string,
  tableName: string,
  handle: UpdateHandle
) {
  const whereStatement = buildWhereStatementFromUpdateHandle(handle)
  await evalSql(`
  DELETE FROM
    ${eid(dbName)}.${eid(tableName)}
  WHERE
    ${whereStatement}
  `)
}

export async function insertTableRow(
  dbName: string,
  tableName: string,
  // Specify all columns, include NULL columns.
  columnsToInsert: UpdateColumnSpec[]
) {
  const fieldNames = columnsToInsert.map((c) => eid(c.columnName))
  const fieldValues = columnsToInsert.map((c) => e(c.value))
  await evalSql(`
  INSERT INTO
    ${eid(dbName)}.${eid(tableName)}
    (${fieldNames.join(', ')})
  VALUES
    (${fieldValues.join(', ')})
  `)
}

type UserSummary = {
  user: string
  host: string
}

type GetUserListResult = {
  users: UserSummary[]
}

export async function getUserList(): Promise<GetUserListResult> {
  const d = await evalSqlObj(`SELECT user, host FROM mysql.user`)
  return {
    users: d.map((o) => ({
      user: o.USER,
      host: o.HOST,
    })),
  }
}

export enum UserPrivilegeId {
  ALTER = 'ALTER',
  ALTER_ROUTINE = 'ALTER_ROUTINE',
  CONFIG = 'CONFIG',
  CREATE = 'CREATE',
  CREATE_ROLE = 'CREATE_ROLE',
  CREATE_ROUTINE = 'CREATE_ROUTINE',
  CREATE_TMP_TABLE = 'CREATE_TMP_TABLE',
  CREATE_USER = 'CREATE_USER',
  CREATE_VIEW = 'CREATE_VIEW',
  DELETE = 'DELETE',
  DROP = 'DROP',
  DROP_ROLE = 'DROP_ROLE',
  EVENT = 'EVENT',
  EXECUTE = 'EXECUTE',
  FILE = 'FILE',
  GRANT = 'GRANT',
  INDEX = 'INDEX',
  INSERT = 'INSERT',
  LOCK_TABLES = 'LOCK_TABLES',
  PROCESS = 'PROCESS',
  REFERENCES = 'REFERENCES',
  RELOAD = 'RELOAD',
  SELECT = 'SELECT',
  SHOW_DB = 'SHOW_DB',
  SHOW_VIEW = 'SHOW_VIEW',
  SHUTDOWN = 'SHUTDOWN',
  SUPER = 'SUPER',
  TRIGGER = 'TRIGGER',
  UPDATE = 'UPDATE',
}

// This name can be used for display
export const UserPrivilegeNames: Record<UserPrivilegeId, string> = {
  ALTER: 'ALTER',
  ALTER_ROUTINE: 'ALTER ROUTINE',
  CONFIG: 'CONFIG',
  CREATE: 'CREATE',
  CREATE_ROLE: 'CREATE ROLE',
  CREATE_ROUTINE: 'CREATE ROUTINE',
  CREATE_TMP_TABLE: 'CREATE TEMPORARY TABLES',
  CREATE_USER: 'CREATE USER',
  CREATE_VIEW: 'CREATE VIEW',
  DELETE: 'DELETE',
  DROP: 'DROP',
  DROP_ROLE: 'DROP ROLE',
  EVENT: 'EVENT',
  EXECUTE: 'EXECUTE',
  FILE: 'FILE',
  GRANT: 'GRANT',
  INDEX: 'INDEX',
  INSERT: 'INSERT',
  LOCK_TABLES: 'LOCK TABLES',
  PROCESS: 'PROCESS',
  REFERENCES: 'REFERENCES',
  RELOAD: 'RELOAD',
  SELECT: 'SELECT',
  SHOW_DB: 'SHOW DATABASES',
  SHOW_VIEW: 'SHOW VIEW',
  SHUTDOWN: 'SHUTDOWN',
  SUPER: 'SUPER',
  TRIGGER: 'TRIGGER',
  UPDATE: 'UPDATE',
}

type UserDetail = {
  grantedPrivileges: UserPrivilegeId[]
}

export async function getUserDetail(
  user: string,
  host: string
): Promise<UserDetail> {
  const selections: string[] = []
  for (const priv of Object.values(UserPrivilegeId)) {
    selections.push(eid(`${priv}_PRIV`))
  }
  const u = await evalSqlObj(
    SqlString.format(
      `SELECT
        ${selections.join(', ')}
      FROM mysql.user WHERE user = ? AND host = ?`,
      [user, host]
    )
  )
  if (u.length === 0) {
    throw new Error(`User ${user}@${host} not found`)
  }
  const grantedPrivileges: UserPrivilegeId[] = []
  for (const priv of Object.values(UserPrivilegeId)) {
    if (u[0][`${priv}_PRIV`] === 'Y') {
      grantedPrivileges.push(priv)
    }
  }
  return {
    grantedPrivileges,
  }
}

export async function dropUser(user: string, host: string) {
  await evalSql(`DROP USER ${e(user)}@${e(host)}`)
}

// Password can be empty string.
export async function createUser(
  user: string,
  host: string,
  password: string,
  privileges: UserPrivilegeId[]
) {
  const id = `${e(user)}@${e(host)}`

  let sql = `CREATE USER ${id}`
  if (password.length > 0) {
    sql += ` IDENTIFIED BY ${e(password)}`
  }
  await evalSql(sql, { debug: false })

  if (privileges.length > 0) {
    const privString = privileges.map((id) => UserPrivilegeNames[id]).join(', ')
    await evalSql(`GRANT ${privString} ON *.* TO ${id}`)
  }
}

// Note: unlisted privileges will be revoked.
export async function resetUserPrivileges(
  user: string,
  host: string,
  privileges: UserPrivilegeId[]
) {
  const id = `${e(user)}@${e(host)}`
  const current = await getUserDetail(user, host)

  const privilegeToRevoke = _.difference(current.grantedPrivileges, privileges)
  if (privilegeToRevoke.length > 0) {
    const privString = privilegeToRevoke
      .map((id) => UserPrivilegeNames[id])
      .join(', ')
    await evalSql(`REVOKE ${privString} ON *.* FROM ${id}`)
  }
  const privilegeToGrant = _.difference(privileges, current.grantedPrivileges)
  if (privilegeToGrant.length > 0) {
    const privString = privilegeToGrant
      .map((id) => UserPrivilegeNames[id])
      .join(', ')
    await evalSql(`GRANT ${privString} ON *.* TO ${id}`)
  }
}

// Password can be empty string.
export async function setUserPassword(
  user: string,
  host: string,
  newPassword: string
) {
  const id = `${e(user)}@${e(host)}`
  await evalSql(`SET PASSWORD FOR ${id} = ${e(newPassword)}`, {
    debug: false,
  })
}
