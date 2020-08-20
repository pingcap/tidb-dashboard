import * as Database from './database'
import { authUsingDefaultCredential } from '@lib/utils/apiClient'

beforeAll(async () => {
  return authUsingDefaultCredential()
})

it('create and drop database', async () => {
  const dbName = `_database_test_${Math.floor(Math.random() * 1000000)}`

  let databases = (await Database.getDatabases()).databases
  expect(databases).not.toContain(dbName)

  await Database.createDatabase(dbName)
  databases = (await Database.getDatabases()).databases
  expect(databases).toContain(dbName)

  await Database.dropDatabase(dbName)
  databases = (await Database.getDatabases()).databases
  expect(databases).not.toContain(dbName)
})
