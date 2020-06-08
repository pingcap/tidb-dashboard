import * as auth from '@lib/utils/auth'
import * as i18n from '@lib/utils/i18n'

export interface AppOptions {
  token: string | null
  hideNav: boolean
  lang: string | null
}

let appOptions: AppOptions = {
  token: null,
  hideNav: false,
  lang: null,
}

export function get() {
  return appOptions
}

export function init() {
  const hash = window.location.hash
  const pos = hash.indexOf('?')
  if (pos !== -1) {
    let q = hash.substring(pos + 1)
    const p = new URLSearchParams(q)
    appOptions = {
      token: p.get('access_token'),
      hideNav: p.get('hideNav') === 'true' || p.get('hideNav') === '1',
      lang: p.get('lang'),
    }
  }
  if (appOptions.token) {
    auth.setStore(new auth.MemAuthTokenStore())
    auth.setAuthToken(appOptions.token)
  } else {
    auth.setStore(new auth.LocalStorageAuthTokenStore())
  }
  if (appOptions.lang) {
    i18n.changeLang(appOptions.lang)
  }
}
