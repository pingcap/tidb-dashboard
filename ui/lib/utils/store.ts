import client, {
  ErrorStrategy,
  InfoInfoResponse,
  InfoWhoAmIResponse,
} from '@lib/client'
import { Store } from 'pullstate'
import { authEvents, EVENT_TOKEN_CHANGED, getAuthToken } from './auth'

interface StoreState {
  whoAmI?: InfoWhoAmIResponse
  appInfo?: InfoInfoResponse
}

export const store = new Store<StoreState>({})

export const useIsWriteable = () =>
  store.useState((s) => Boolean(s.whoAmI && s.whoAmI.is_writeable))

export async function reloadWhoAmI() {
  if (!getAuthToken()) {
    store.update((s) => {
      s.whoAmI = undefined
    })
    return
  }

  try {
    const resp = await client.getInstance().infoWhoami({
      errorStrategy: ErrorStrategy.Custom,
    })
    store.update((s) => {
      s.whoAmI = resp.data
    })
  } catch (ex) {
    store.update((s) => {
      s.whoAmI = undefined
    })
  }
}

export async function mustLoadAppInfo(): Promise<InfoInfoResponse> {
  const resp = await client.getInstance().infoGet({
    errorStrategy: ErrorStrategy.Custom,
  })
  store.update((s) => {
    s.appInfo = resp.data
  })
  return resp.data
}

authEvents.on(EVENT_TOKEN_CHANGED, async () => {
  await reloadWhoAmI()
})
