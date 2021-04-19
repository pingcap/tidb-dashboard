interface Cacheable<Fn extends Function> {
  call: Fn
  clear: () => void
}

const cacheMap = new Map<Function, any>()

/**
 * function someFunction() {
 *   return Date.now()
 * }
 * const cachedSomeFunction = cache(someFunction)
 *
 * cachedSomeFunction.call() // e.g. 12345
 * cachedSomeFunction.call() // 12345
 *
 * cachedSomeFunction.clear()
 *
 * cachedSomeFunction.call() // e.g. 12346
 */
export const cache = <Fn extends Function>(fn: Fn): Cacheable<Fn> => {
  const call: any = (...args: any[]) => {
    if (cacheMap.has(fn)) {
      return cacheMap.get(fn)
    }
    const rst = fn(...args)
    cacheMap.set(fn, rst)
    return rst
  }

  const clear = () => {
    cacheMap.delete(fn)
  }

  return {
    call,
    clear,
  }
}
