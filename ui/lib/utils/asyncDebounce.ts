import { debounce, DebounceSettings } from 'lodash'

export function asyncDebounce<T extends (...args: any) => Promise<any>>(
  func: T,
  wait?: number,
  options?: DebounceSettings
): T {
  const debounced = debounce(
    (resolve, reject, _args) => {
      func(..._args)
        .then(resolve)
        .catch(reject)
    },
    wait,
    options
  )
  return ((...args) =>
    new Promise((resolve, reject) => {
      debounced(resolve, reject, args)
    })) as T
}
