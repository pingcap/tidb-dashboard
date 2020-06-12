export function isLocationMatch(s, matchPrefix = false): boolean {
  let hash = window.location.hash
  if (!hash || hash === '#') {
    hash = '#/'
  }
  if (matchPrefix) {
    return hash.indexOf(`#${s}`) === 0
  } else {
    return hash.trim() === `#${s}`
  }
}

export function isLocationMatchPrefix(s): boolean {
  return isLocationMatch(s, true)
}

export function isPortalPage(): boolean {
  return window.location.pathname.endsWith('/portal')
}
