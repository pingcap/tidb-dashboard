import client, {
  ErrorStrategy,
  InfoInfoResponse,
  InfoWhoAmIResponse
} from '@lib/client'
import { Store } from 'pullstate'
import { authEvents, EVENT_TOKEN_CHANGED, getAuthToken } from './auth'

interface StoreState {
  whoAmI?: InfoWhoAmIResponse
  appInfo?: InfoInfoResponse
}

// sync with /tidb-dashboard/pkg/apiserver/utils/ngm.go NgmState
export enum NgmState {
  NotSupported = 'not_supported',
  NotStarted = 'not_started',
  Started = 'started'
}

export const store = new Store<StoreState>({})

export const useIsWriteable = () =>
  store.useState((s) => Boolean(s.whoAmI && s.whoAmI.is_writeable))

export const useIsFeatureSupport = (feature: string) =>
  store.useState(
    (s) => (s.appInfo?.supported_features?.indexOf(feature) ?? -1) !== -1
  )

export const useNgmState = () => store.useState((s) => s.appInfo?.ngm_state)

export async function reloadWhoAmI(): Promise<boolean> {
  if (!getAuthToken()) {
    store.update((s) => {
      s.whoAmI = undefined
    })
    return false
  }

  try {
    const resp = await client.getInstance().infoWhoami({
      errorStrategy: ErrorStrategy.Custom
    })
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
    errorStrategy: ErrorStrategy.Custom
  })
  store.update((s) => {
    s.appInfo = resp.data
  })
  return resp.data
}

authEvents.on(EVENT_TOKEN_CHANGED, async () => {
  await reloadWhoAmI()
})
