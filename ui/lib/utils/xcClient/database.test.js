import SqlString from 'sqlstring'
import * as Database from './database'
import { authUsingDefaultCredential } from '@lib/utils/apiClient'
import { evalSql } from './util'

const DB_NAME = 'DASHBOARD_TEST_DB'

function newId(prefix) {
  return `${prefix}_${Math.floor(Math.random() * 1000000)}`
}

beforeAll(async () => {
  await authUsingDefaultCredential()
  await evalSql(`DROP DATABASE IF EXISTS ${SqlString.escapeId(DB_NAME)}`)
  await Database.createDatabase(DB_NAME)
})

afterAll(async () => {
  await evalSql(`DROP DATABASE IF EXISTS ${SqlString.escapeId(DB_NAME)}`)
})

it('create and drop database', async () => {
  const dbName = newId('db')
  {
    const databases = (await Database.getDatabases()).databases
    expect(databases).not.toContain(dbName)
  }
  await Database.createDatabase(dbName)
  try {
    const databases = (await Database.getDatabases()).databases
    expect(databases).toContain(dbName)
  } finally {
    await Database.dropDatabase(dbName)
    const databases = (await Database.getDatabases()).databases
    expect(databases).not.toContain(dbName)
  }
})

it('list table', async () => {
  {
    const tables = (await Database.getTables('INFORMATION_SCHEMA')).tables
    expect(tables).toContain('CLUSTER_STATEMENTS_SUMMARY_HISTORY')
  }
  {
    const tableName = newId('table')
    {
      const tables = (await Database.getTables(DB_NAME)).tables
      expect(tables).not.toContain(tableName)
    }
    {
      await evalSql(`CREATE TABLE ${DB_NAME}.${tableName} (id int);`)
      const tables = (await Database.getTables(DB_NAME)).tables
      expect(tables).toContain(tableName)
    }
    {
      await Database.dropTable(DB_NAME, tableName)
      const tables = (await Database.getTables(DB_NAME)).tables
      expect(tables).not.toContain(tableName)
    }
  }
  {
    // Rename
    const tableName = newId('table')
    await evalSql(`CREATE TABLE ${DB_NAME}.${tableName} (id int);`)
    const originalTableName = tableName
    let currentTableName = tableName
    {
      const newTableName = newId('table')
      await Database.renameTable(DB_NAME, tableName, newTableName)
      currentTableName = newTableName
    }
    {
      await Database.dropTable(DB_NAME, currentTableName)
      const tables = (await Database.getTables(DB_NAME)).tables
      expect(tables).not.toContain(currentTableName)
      expect(tables).not.toContain(originalTableName)
    }
  }
})

it('get table info', async () => {
  // Basic schema
  {
    const tableName = newId('table')
    await evalSql(`
    CREATE TABLE ${DB_NAME}.${tableName} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      c_char_1 VARCHAR(255) NOT NULL,
      c_char_2 VARCHAR(10) DEFAULT 'abc',
      c_date DATE,
      c_int_1 TINYINT UNSIGNED NOT NULL DEFAULT 3,
      c_int_2 TINYINT UNSIGNED NOT NULL,
      c_text TEXT COMMENT 'description column',
      c_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`)
    const d = await Database.getTableInfo(DB_NAME, tableName)
    expect(d).toEqual({
      columns: [
        {
          name: 'id',
          fieldType: 'int(11)',
          isNotNull: true,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'c_char_1',
          fieldType: 'varchar(255)',
          isNotNull: true,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'c_char_2',
          fieldType: 'varchar(10)',
          isNotNull: false,
          defaultValue: 'abc',
          comment: '',
        },
        {
          name: 'c_date',
          fieldType: 'date',
          isNotNull: false,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'c_int_1',
          fieldType: 'tinyint(3) unsigned',
          isNotNull: true,
          defaultValue: '3',
          comment: '',
        },
        {
          name: 'c_int_2',
          fieldType: 'tinyint(3) unsigned',
          isNotNull: true,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'c_text',
          fieldType: 'text',
          isNotNull: false,
          defaultValue: null,
          comment: 'description column',
        },
        {
          name: 'c_timestamp',
          fieldType: 'timestamp',
          isNotNull: false,
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
    await Database.dropTable(DB_NAME, tableName)
  }

  // Primary key with multiple columns
  {
    const tableName = newId('table')
    await evalSql(`
    CREATE TABLE ${DB_NAME}.${tableName} (
      a INT,
      b varchar(100),
      c int,
      PRIMARY KEY (a, c)
    )`)
    const d = await Database.getTableInfo(DB_NAME, tableName)
    expect(d).toEqual({
      columns: [
        {
          name: 'a',
          fieldType: 'int(11)',
          isNotNull: true,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'b',
          fieldType: 'varchar(100)',
          isNotNull: false,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'c',
          fieldType: 'int(11)',
          isNotNull: true,
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
    await Database.dropTable(DB_NAME, tableName)
  }

  // Indexes
  {
    const tableName = newId('table')
    await evalSql(`
    CREATE TABLE ${DB_NAME}.${tableName} (
      id int(11) NOT NULL AUTO_INCREMENT,
      c varchar(255) DEFAULT NULL,
      d varchar(255) DEFAULT NULL,
      e varchar(255) DEFAULT NULL,
      g int(255) unsigned DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY cidx (c),
      KEY cidx2 (c,id)
    )`)
    const d = await Database.getTableInfo(DB_NAME, tableName)
    expect(d).toEqual({
      columns: [
        {
          name: 'id',
          fieldType: 'int(11)',
          isNotNull: true,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'c',
          fieldType: 'varchar(255)',
          isNotNull: false,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'd',
          fieldType: 'varchar(255)',
          isNotNull: false,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'e',
          fieldType: 'varchar(255)',
          isNotNull: false,
          defaultValue: null,
          comment: '',
        },
        {
          name: 'g',
          fieldType: 'int(255) unsigned',
          isNotNull: false,
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
    await Database.dropTable(DB_NAME, tableName)
  }
})

it('get table info for native tables successfully', async () => {
  const tables = (await Database.getTables('INFORMATION_SCHEMA')).tables
  for (const tableName of tables) {
    await Database.getTableInfo('INFORMATION_SCHEMA', tableName)
  }
})

it('add and drop column', async () => {
  const tableName = newId('table')
  await evalSql(`
  CREATE TABLE ${DB_NAME}.${tableName} (
    a INT
  )`)
  const colName = newId('col')
  const newColumn = {
    name: colName,
    fieldType: {
      typeName: 'int',
    },
  }
  await Database.addTableColumnAtTail(DB_NAME, tableName, newColumn)
  {
    const d = await Database.getTableInfo(DB_NAME, tableName)
    expect(d).toEqual({
      columns: [
        {
          name: 'a',
          fieldType: 'int(11)',
          isNotNull: false,
          defaultValue: null,
          comment: '',
        },
        {
          name: colName,
          fieldType: 'int(11)',
          isNotNull: false,
          defaultValue: null,
          comment: '',
        },
      ],
      indexes: [],
    })
  }

  await Database.dropTableColumn(DB_NAME, tableName, colName)
  {
    const d = await Database.getTableInfo(DB_NAME, tableName)
    expect(d).toEqual({
      columns: [
        {
          name: 'a',
          fieldType: 'int(11)',
          isNotNull: false,
          defaultValue: null,
          comment: '',
        },
      ],
      indexes: [],
    })
  }

  await Database.dropTable(DB_NAME, tableName)
})

it('add column with auto fixed length', async () => {
  const tableName = newId('table')
  await evalSql(`
  CREATE TABLE ${DB_NAME}.${tableName} (
    a INT
  )`)
  // Test VARCHAR becomes VARCHAR(255) by default
  const colName = newId('col')
  const newColumn = {
    name: colName,
    fieldType: {
      typeName: 'varchar',
      isUnsigned: true, // unsigned is ignored
    },
  }
  await Database.addTableColumnAtHead(DB_NAME, tableName, newColumn)
  {
    const d = await Database.getTableInfo(DB_NAME, tableName)
    expect(d.columns[0]).toEqual({
      name: colName,
      fieldType: 'varchar(255)',
      isNotNull: false,
      defaultValue: null,
      comment: '',
    })
  }

  // Test inappropiate length is erased
  const colName2 = newId('col')
  const newColumn2 = {
    name: colName2,
    fieldType: {
      typeName: 'year',
      length: 123,
      decimals: 5,
    },
    comment: 'This is a comment',
  }
  await Database.addTableColumnAfter(DB_NAME, tableName, newColumn2, colName)
  {
    const d = await Database.getTableInfo(DB_NAME, tableName)
    expect(d.columns[1]).toEqual({
      name: colName2,
      fieldType: 'year(4)',
      isNotNull: false,
      defaultValue: null,
      comment: 'This is a comment',
    })
  }

  await Database.dropTable(DB_NAME, tableName)
})

it('add column with default values and complex types', async () => {
  const tableName = newId('table')
  await evalSql(`
  CREATE TABLE ${DB_NAME}.${tableName} (
    a INT
  )`)
  const colName = newId('col')
  const newColumn = {
    name: colName,
    fieldType: {
      typeName: 'float',
      length: 10,
      decimals: 5,
      isUnsigned: true, // unsigned is reserved
      isNotNull: true,
    },
    defaultValue: '123.4',
  }
  await Database.addTableColumnAtHead(DB_NAME, tableName, newColumn)
  {
    const d = await Database.getTableInfo(DB_NAME, tableName)
    expect(d.columns[0]).toEqual({
      name: colName,
      fieldType: 'float(10,5) unsigned',
      isNotNull: true,
      defaultValue: '123.4',
      comment: '',
    })
  }
  await Database.dropTable(DB_NAME, tableName)
})
