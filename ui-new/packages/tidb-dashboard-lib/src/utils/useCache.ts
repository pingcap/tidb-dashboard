import { createContext, useRef } from 'react'

type CacheItem = {
  expireAt: number
  data: any
}

type CacheStorage = Record<string, CacheItem>

const ONE_HOUR_TIME = 1 * 60 * 60 * 1000

export const CacheContext = createContext<CacheMgr | undefined>(undefined)

export class CacheMgr {
  private cache: CacheStorage = {}
  private cacheItemKeys: string[] = []
  private capacity: number
  private globalExpire: number

  constructor(capacity: number = 1, globalExpire: number = ONE_HOUR_TIME) {
    this.capacity = capacity
    this.globalExpire = globalExpire
  }

  get(key: string): any {
    const item = this.cache[key]
    if (item === undefined) {
      return undefined
    }
    if (item.expireAt < new Date().valueOf()) {
      this.remove(key)
      return undefined
    }
    return item.data
  }

  set(key: string, val: any, expire?: number) {
    const curTime = new Date().valueOf()
    let expireAt: number
    if (expire) {
      expireAt = curTime + expire
    } else {
      expireAt = curTime + this.globalExpire
    }
    this.cache[key] = {
      expireAt,
      data: val
    }

    // put the latest key in the end of cacheItemKeys
    this.cacheItemKeys = this.cacheItemKeys.filter((k) => k !== key).concat(key)
    // if size beyonds the capacity
    // remove the old ones
    while (this.capacity > 0 && this.cacheItemKeys.length > this.capacity) {
      this.remove(this.cacheItemKeys[0])
    }
  }

  remove(key: string) {
    delete this.cache[key]
    this.cacheItemKeys = this.cacheItemKeys.filter((k) => k !== key)
  }

  clear() {
    this.cache = {}
    this.cacheItemKeys = []
  }
}

export default function useCache(
  capacity: number = 1,
  globalExpire: number = ONE_HOUR_TIME
): CacheMgr {
  const cache = useRef(new CacheMgr(capacity, globalExpire))
  return cache.current
}
