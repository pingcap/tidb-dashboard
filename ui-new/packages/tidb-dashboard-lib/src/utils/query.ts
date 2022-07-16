export interface IQueryParams {
  [key: string]: any
}

export function parseQueryFn<T = IQueryParams>() {
  return (qs: string): T => {
    const p = new URLSearchParams(qs)
    const json = p.get('query')
    if (json == null) {
      return {} as T
    }
    const r = JSON.parse(json)
    if (!!r && r.constructor === Object) {
      return r as T
    }
    return {} as T
  }
}

export function buildQueryFn<T = IQueryParams>() {
  return (q: T): string => {
    const json = JSON.stringify(q)
    const p = new URLSearchParams()
    p.set('query', json)
    return p.toString()
  }
}

export function stripQueryString(url: string) {
  return url.split('?')[0]
}
