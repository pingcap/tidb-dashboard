import { store, ReqConfig } from '@pingcap/tidb-dashboard-lib'
import client from '~/client'

export async function reloadWhoAmI(): Promise<boolean> {
  try {
    const resp = await client.getInstance().infoWhoami({
      handleError: 'custom'
    } as ReqConfig)
    store.update((s) => {
      s.whoAmI = resp.data
    })
    return true
  } catch (ex) {
    store.update((s) => {
      s.whoAmI = undefined
    })
    return false
  }
}
