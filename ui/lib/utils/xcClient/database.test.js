import * as Database from './database'
import { authUsingDefaultCredential } from '@lib/utils/apiClient'
import { evalSql } from './util'

beforeAll(async () => {
  return authUsingDefaultCredential()
})

function newId(prefix) {
  return `${prefix}_${Math.floor(Math.random() * 1000000)}`
}

it('create and drop database', async () => {
  const dbName = newId('db')

  let databases = (await Database.getDatabases()).databases
  expect(databases).not.toContain(dbName)

  await Database.createDatabase(dbName)
  try {
    databases = (await Database.getDatabases()).databases
    expect(databases).toContain(dbName)
  } finally {
    await Database.dropDatabase(dbName)
    databases = (await Database.getDatabases()).databases
    expect(databases).not.toContain(dbName)
  }
})

it('list table', async () => {
  let tables = (await Database.getTables('INFORMATION_SCHEMA')).tables
  expect(tables).toContain('CLUSTER_STATEMENTS_SUMMARY_HISTORY')

  const tableName = newId('table')
  tables = (await Database.getTables('test')).tables
  expect(tables).not.toContain(tableName)

  await evalSql(`CREATE TABLE test.${tableName} (id int);`)

  try {
    tables = (await Database.getTables('test')).tables
    expect(tables).toContain(tableName)
  } finally {
    await Database.dropTable('test', tableName)
    tables = (await Database.getTables('test')).tables
    expect(tables).not.toContain(tableName)
  }
})

it('get table info', async () => {
  // Basic schema
  let tableName = newId('table')
  await evalSql(`
    CREATE TABLE test.${tableName} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      c_char_1 VARCHAR(255) NOT NULL,
      c_char_2 VARCHAR(10) DEFAULT 'abc',
      c_date DATE,
      c_int_1 TINYINT UNSIGNED NOT NULL DEFAULT 3,
      c_int_2 TINYINT UNSIGNED NOT NULL,
      c_text TEXT COMMENT 'description column',
      c_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)
  try {
    const d = await Database.getTableInfo('test', tableName)
    expect(d).toEqual({
      columns: [
        {
          name: 'id',
          type: 'int(11)',
          isNullable: false,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'c_char_1',
          type: 'varchar(255)',
          isNullable: false,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'c_char_2',
          type: 'varchar(10)',
          isNullable: true,
          defaultValue: 'abc',
          comment: '',
        },
        {
          name: 'c_date',
          type: 'date',
          isNullable: true,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'c_int_1',
          type: 'tinyint(3) unsigned',
          isNullable: false,
          defaultValue: '3',
          comment: '',
        },
        {
          name: 'c_int_2',
          type: 'tinyint(3) unsigned',
          isNullable: false,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'c_text',
          type: 'text',
          isNullable: true,
          defaultValue: null,
          comment: 'description column',
        },
        {
          name: 'c_timestamp',
          type: 'timestamp',
          isNullable: true,
          defaultValue: 'CURRENT_TIMESTAMP',
          comment: '',
        },
      ],
      indexes: [
        {
          name: 'PRIMARY',
          type: Database.TableInfoIndexType.Primary,
          columns: ['id'],
          isDeleteble: false,
        },
      ],
    })
  } finally {
    await Database.dropTable('test', tableName)
  }

  // Primary key with multiple columns
  tableName = newId('table')
  await evalSql(`
    CREATE TABLE test.${tableName} (
      a INT,
      b varchar(100),
      c int,
      PRIMARY KEY (a, c)
  )`)
  try {
    const d = await Database.getTableInfo('test', tableName)
    expect(d).toEqual({
      columns: [
        {
          name: 'a',
          type: 'int(11)',
          isNullable: false,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'b',
          type: 'varchar(100)',
          isNullable: true,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'c',
          type: 'int(11)',
          isNullable: false,
          defaultValue: null,
          comment: '',
        },
      ],
      indexes: [
        {
          name: 'PRIMARY',
          type: Database.TableInfoIndexType.Primary,
          columns: ['a', 'c'],
          isDeleteble: false,
        },
      ],
    })
  } finally {
    await Database.dropTable('test', tableName)
  }

  // Indexes
  tableName = newId('table')
  await evalSql(`
    CREATE TABLE test.${tableName} (
      id int(11) NOT NULL AUTO_INCREMENT,
      c varchar(255) DEFAULT NULL,
      d varchar(255) DEFAULT NULL,
      e varchar(255) DEFAULT NULL,
      g int(255) unsigned DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY cidx (c),
      KEY cidx2 (c,id)
  )`)
  try {
    const d = await Database.getTableInfo('test', tableName)
    expect(d).toEqual({
      columns: [
        {
          name: 'id',
          type: 'int(11)',
          isNullable: false,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'c',
          type: 'varchar(255)',
          isNullable: true,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'd',
          type: 'varchar(255)',
          isNullable: true,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'e',
          type: 'varchar(255)',
          isNullable: true,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'g',
          type: 'int(255) unsigned',
          isNullable: true,
          defaultValue: null,
          comment: '',
        },
      ],
      indexes: [
        {
          name: 'PRIMARY',
          type: Database.TableInfoIndexType.Primary,
          columns: ['id'],
          isDeleteble: false,
        },
        {
          name: 'cidx',
          type: Database.TableInfoIndexType.Unique,
          columns: ['c'],
          isDeleteble: true,
        },
        {
          name: 'cidx2',
          type: Database.TableInfoIndexType.Normal,
          columns: ['c', 'id'],
          isDeleteble: true,
        },
      ],
    })
  } finally {
    await Database.dropTable('test', tableName)
  }
})

it('get table info for native tables successfully', async () => {
  const tables = (await Database.getTables('INFORMATION_SCHEMA')).tables
  for (const tableName of tables) {
    await Database.getTableInfo('INFORMATION_SCHEMA', tableName)
  }
})
