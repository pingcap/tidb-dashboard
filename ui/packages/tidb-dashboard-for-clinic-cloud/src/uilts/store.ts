import { store, ReqConfig } from '@pingcap/tidb-dashboard-lib'
import client, { InfoInfoResponse } from '~/client'

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

export async function mustLoadAppInfo(): Promise<InfoInfoResponse> {
  const resp = await client.getInstance().infoGet({
    handleError: 'custom'
  } as ReqConfig)
  store.update((s) => {
    s.appInfo = resp.data
  })
  return resp.data
}
