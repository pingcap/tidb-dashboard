// Modified from github.com/microsoft/SandDance under the MIT license.
import { strings } from './language'

export function invalidUrlError(url: string | undefined) {
  if (!url) {
    return strings.errorNoUrl
  }
  if (url.toLocaleLowerCase().substr(0, 4) !== 'http') {
    return strings.errorUrlHttp
  }
}

export interface LocalStorageManager<T> {
  get(): T | undefined

  set(data: T | undefined)
}

export function getLocalStorageManager<T>(key: string) {
  return {
    get() {
      const r = localStorage.getItem(key)
      if (!r) return undefined
      return JSON.parse(r)
    },
    set(data) {
      if (data === undefined) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(data))
    },
  }
}

export function copyToClipboard(content: string): boolean {
  const transfer = document.createElement('input')
  document.body.appendChild(transfer)
  transfer.value = content
  transfer.focus()
  transfer.select()
  let result: boolean
  if ((result = document.execCommand('copy'))) {
    transfer.blur()
  }
  document.body.removeChild(transfer)
  return result
}
