import { useRef, createContext } from 'react'

type CacheItem = {
  expireAt: number
  data: any
}

type Cache = Record<string, CacheItem>

const ONE_HOUR_TIME = 1 * 60 * 60 * 1000

export type CacheMgr = {
  get: (key: string) => any
  set: (key: string, val: any, expire?: number) => void
  remove: (key: string) => void
}

export const CacheContext = createContext<CacheMgr | null>(null)

export default function useCache(
  capacity: number = 1,
  globalExpire: number = ONE_HOUR_TIME
): CacheMgr {
  const cache = useRef<Cache>({})
  const cacheItemKeys = useRef<string[]>([])

  function get(key: string): any {
    const item = cache.current[key]
    if (item === undefined) {
      return undefined
    }
    if (item.expireAt < new Date().valueOf()) {
      remove(key)
      return undefined
    }
    return item.data
  }

  function set(key: string, val: any, expire?: number) {
    const curTime = new Date().valueOf()
    let expireAt: number
    if (expire) {
      expireAt = curTime + expire
    } else {
      expireAt = curTime + globalExpire
    }
    cache.current[key] = {
      expireAt,
      data: val,
    }

    // put the latest key in the end of cacheItemKeys
    cacheItemKeys.current = cacheItemKeys.current
      .filter((k) => k !== key)
      .concat(key)
    // if size beyonds the capacity
    // remove the first one
    if (cacheItemKeys.current.length > capacity) {
      remove(cacheItemKeys.current[0])
    }
  }

  function remove(key: string) {
    delete cache.current[key]
    cacheItemKeys.current = cacheItemKeys.current.filter((k) => k !== key)
  }

  return { get, set, remove }
}
