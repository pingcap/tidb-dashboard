import { useLocalStorageState } from 'ahooks'

export function useCompatibilityLocalstorage<T>(
  key: string,
  defaultValue: T | (() => T)
) {
  return useLocalStorageState(
    `${key}_${process.env.INTERNAL_VERSION}`,
    defaultValue
  )
}
