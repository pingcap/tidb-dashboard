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

export function parse() {
  const hash = window.location.hash
  const pos = hash.indexOf('?')
  if (pos === -1) {
    return
  }
  let q = hash.substring(pos + 1)
  const p = new URLSearchParams(q)
  appOptions = {
    token: p.get('access_token'),
    hideNav: p.get('hideNav') === 'true' || p.get('hideNav') === '1',
    lang: p.get('lang'),
  }
}
