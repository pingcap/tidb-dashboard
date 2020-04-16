export function isLocationMatch(s, matchPrefix) {
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

export function isLocationMatchPrefix(s) {
  return isLocationMatch(s, true)
}
