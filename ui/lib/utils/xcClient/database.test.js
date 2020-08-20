import * as Database from './database'
import { authUsingDefaultCredential } from '@lib/utils/apiClient'

beforeAll(async () => {
  return authUsingDefaultCredential()
})

it('sums numbers', async () => {
  console.log(await Database.getDatabases())
})
