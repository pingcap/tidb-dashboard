import { InfoInfoResponse, InfoWhoAmIResponse } from '@lib/client'
import { Store } from 'pullstate'

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
