export type Place = 'local' | 'session'

export function store<T>(key: string, value: T, to: Place = 'local') {
  if (to === 'local') {
    localStorage.setItem(key, JSON.stringify(value))
  } else {
    sessionStorage.setItem(key, JSON.stringify(value))
  }
}

export function load<T>(key: string, defValue: T, from: Place = 'local'): T {
  let content
  if (from === 'local') {
    content = localStorage.getItem(key)
  } else {
    content = sessionStorage.getItem(key)
  }
  if (content === null) {
    return defValue
  }
  return JSON.parse(content)
}

export function remove(key: string, from: Place = 'local') {
  if (from === 'local') {
    localStorage.removeItem(key)
  } else {
    sessionStorage.removeItem(key)
  }
}
