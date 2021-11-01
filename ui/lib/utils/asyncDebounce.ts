import { debounce, DebounceSettings } from 'lodash'

export function asyncDebounce<T extends (...args: any) => any>(
  func: T,
  wait?: number,
  options?: DebounceSettings
): T {
  const debounced = debounce(
    (resolve, reject, args) => {
      func(...args)
        .then(resolve)
        .catch(reject)
    },
    wait,
    options
  )
  return ((...args) =>
    new Promise((resolve, reject) => {
      debounced(resolve, reject, args)
    })) as any
}
