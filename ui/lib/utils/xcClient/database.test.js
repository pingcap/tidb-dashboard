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

it('add and drop index', async () => {
  const tableName = newId('table')
  await evalSql(`
  CREATE TABLE ${DB_NAME}.${tableName} (
    a INT,
    b INT,
    c INT
  )`)
  {
    await Database.addTableIndex(DB_NAME, tableName, {
      name: 'idx1',
      type: Database.TableInfoIndexType.Normal,
      columns: [{ columnName: 'a' }],
    })
    const { indexes } = await Database.getTableInfo(DB_NAME, tableName)
    expect(indexes).toEqual([
      {
        name: 'idx1',
        type: Database.TableInfoIndexType.Normal,
        columns: ['a'],
        isDeleteble: true,
      },
    ])
  }
  {
    await Database.addTableIndex(DB_NAME, tableName, {
      name: 'idx2',
      type: Database.TableInfoIndexType.Unique,
      columns: [{ columnName: 'b' }, { columnName: 'a' }],
    })
    const { indexes } = await Database.getTableInfo(DB_NAME, tableName)
    expect(indexes[1]).toEqual({
      name: 'idx2',
      type: Database.TableInfoIndexType.Unique,
      columns: ['b', 'a'],
      isDeleteble: true,
    })
  }
  {
    await Database.dropTableIndex(DB_NAME, tableName, 'idx1')
    const { indexes } = await Database.getTableInfo(DB_NAME, tableName)
    expect(indexes).toEqual([
      {
        name: 'idx2',
        type: Database.TableInfoIndexType.Unique,
        columns: ['b', 'a'],
        isDeleteble: true,
      },
    ])
  }
  await Database.dropTable(DB_NAME, tableName)
})

it('create simple table', async () => {
  const tableName = newId('table')
  await Database.createTable({
    dbName: DB_NAME,
    tableName,
    columns: [
      {
        name: 'a',
        fieldType: { typeName: 'INT' },
      },
    ],
  })
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
  await Database.dropTable(DB_NAME, tableName)
})

it('create table with primary key', async () => {
  const tableName = newId('table')
  await Database.createTable({
    dbName: DB_NAME,
    tableName,
    columns: [
      {
        name: 'a',
        fieldType: { typeName: 'INT' },
        isAutoIncrement: true,
      },
    ],
    primaryKeys: [{ columnName: 'a' }],
  })
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
    ],
    indexes: [
      {
        name: 'PRIMARY',
        type: Database.TableInfoIndexType.Primary,
        columns: ['a'],
        isDeleteble: false,
      },
    ],
  })
  await Database.dropTable(DB_NAME, tableName)
})

it('create table with multi column primary key', async () => {
  const tableName = newId('table')
  await Database.createTable({
    dbName: DB_NAME,
    tableName,
    columns: [
      {
        name: 'a',
        fieldType: { typeName: 'INT' },
      },
      {
        name: 'b',
        fieldType: { typeName: 'VARCHAR' },
      },
      {
        name: 'c',
        fieldType: { typeName: 'INT' },
      },
    ],
    primaryKeys: [{ columnName: 'b' }, { columnName: 'a' }],
  })
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
        fieldType: 'varchar(255)',
        isNotNull: true,
        defaultValue: null,
        comment: '',
      },
      {
        name: 'c',
        fieldType: 'int(11)',
        isNotNull: false,
        defaultValue: null,
        comment: '',
      },
    ],
    indexes: [
      {
        name: 'PRIMARY',
        type: Database.TableInfoIndexType.Primary,
        columns: ['b', 'a'],
        isDeleteble: false,
      },
    ],
  })
  await Database.dropTable(DB_NAME, tableName)
})

it('create table with comment', async () => {
  const tableName = newId('table')
  await Database.createTable({
    dbName: DB_NAME,
    tableName,
    columns: [
      {
        name: 'a',
        fieldType: { typeName: 'INT' },
      },
    ],
    comment: 'foo',
  })
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
  await Database.dropTable(DB_NAME, tableName)
})

it('select from a system table', async () => {
  const d = await Database.selectTableRow('INFORMATION_SCHEMA', 'TABLES')
  expect(d.isUpdatable).toEqual(false)
  expect(d.isPaginationUnavailable).toEqual(true)
  expect(d.rows.length > 0).toEqual(true)
})

it('select from a table without PK', async () => {
  const tableName = newId('table')
  await evalSql(`
  CREATE TABLE ${DB_NAME}.${tableName} (
    c int,
    d text
  )`)
  await evalSql(`INSERT INTO ${DB_NAME}.${tableName} VALUES (100, "a")`)
  const d = await Database.selectTableRow(DB_NAME, tableName)
  expect(d.rows).toEqual([['100', 'a']])
  expect(d.isUpdatable).toEqual(true)
  expect(d.handles).toEqual([
    { whereColumns: [{ columnName: '_TIDB_ROWID', columnValue: '1' }] },
  ])
})

it('select from a table with PK', async () => {
  const tableName = newId('table')
  await evalSql(`
  CREATE TABLE ${DB_NAME}.${tableName} (
    c int,
    d text,
    e int PRIMARY KEY
  )`)
  await evalSql(`INSERT INTO ${DB_NAME}.${tableName} VALUES (100, "a", 30)`)
  await evalSql(`INSERT INTO ${DB_NAME}.${tableName} VALUES (101, "b", 20)`)
  const d = await Database.selectTableRow(DB_NAME, tableName)
  expect(d.rows).toEqual([
    ['101', 'b', '20'],
    ['100', 'a', '30'],
  ])
  expect(d.isUpdatable).toEqual(true)
  expect(d.handles).toEqual([
    { whereColumns: [{ columnName: 'E', columnValue: '20' }] },
    { whereColumns: [{ columnName: 'E', columnValue: '30' }] },
  ])
})

it('select from a table with multi-column PK', async () => {
  const tableName = newId('table')
  await evalSql(`
  CREATE TABLE ${DB_NAME}.${tableName} (
    c int,
    d text,
    e int,
    PRIMARY KEY (e, c)
  )`)
  await evalSql(`INSERT INTO ${DB_NAME}.${tableName} VALUES (99, "a", 30)`)
  await evalSql(`INSERT INTO ${DB_NAME}.${tableName} VALUES (101, "a", 30)`)
  await evalSql(`INSERT INTO ${DB_NAME}.${tableName} VALUES (100, "a", 30)`)
  await evalSql(`INSERT INTO ${DB_NAME}.${tableName} VALUES (102, "b", 20)`)
  const d = await Database.selectTableRow(DB_NAME, tableName)
  expect(d.rows).toEqual([
    ['102', 'b', '20'],
    ['99', 'a', '30'],
    ['100', 'a', '30'],
    ['101', 'a', '30'],
  ])
  expect(d.isUpdatable).toEqual(true)
  expect(d.handles).toEqual([
    {
      whereColumns: [
        { columnName: 'E', columnValue: '20' },
        { columnName: 'C', columnValue: '102' },
      ],
    },
    {
      whereColumns: [
        { columnName: 'E', columnValue: '30' },
        { columnName: 'C', columnValue: '99' },
      ],
    },
    {
      whereColumns: [
        { columnName: 'E', columnValue: '30' },
        { columnName: 'C', columnValue: '100' },
      ],
    },
    {
      whereColumns: [
        { columnName: 'E', columnValue: '30' },
        { columnName: 'C', columnValue: '101' },
      ],
    },
  ])
})

it('select users', async () => {
  const d = await Database.getUserList()
  expect(d.users).toContainEqual({ user: 'root', host: '%' })
})

it('select user detail', async () => {
  const d = await Database.getUserDetail('root', '%')
  expect(d).toEqual({
    grantedPrivileges: Object.values(Database.UserPrivilegeId),
  })
})

it('create user and grant privileges', async () => {
  const username = newId('user')
  try {
    await Database.createUser(username, '%', '', [
      Database.UserPrivilegeId.CREATE_TMP_TABLE,
      Database.UserPrivilegeId.DROP,
    ])
    {
      const d = await Database.getUserList()
      expect(d.users).toContainEqual({ user: username, host: '%' })
    }
    {
      const p = Database.getUserDetail(username, '')
      await expect(p).rejects.toThrowError(`User ${username}@ not found`)
    }
    {
      const d = await Database.getUserDetail(username, '%')
      expect(d).toEqual({
        grantedPrivileges: [
          Database.UserPrivilegeId.CREATE_TMP_TABLE,
          Database.UserPrivilegeId.DROP,
        ],
      })
    }
    await Database.resetUserPrivileges(username, '%', [
      Database.UserPrivilegeId.DROP,
      Database.UserPrivilegeId.DROP_ROLE,
    ])
    {
      const d = await Database.getUserDetail(username, '%')
      expect(d).toEqual({
        grantedPrivileges: [
          Database.UserPrivilegeId.DROP,
          Database.UserPrivilegeId.DROP_ROLE,
        ],
      })
    }
  } finally {
    await Database.dropUser(username, '%')
  }
  {
    const p = Database.getUserDetail(username, '%')
    await expect(p).rejects.toThrowError(`User ${username}@% not found`)
  }
  {
    const d = await Database.getUserList()
    expect(d.users).not.toContainEqual({ user: username, host: '%' })
  }
})
