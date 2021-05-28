import { useLocalStorageState } from 'ahooks'

// we can **update version field in package.json** to upgrade local storage version key
export function useCompatibilityLocalstorage<T>(
  key: string,
  defaultValue: T | (() => T)
) {
  return useLocalStorageState(
    `${key}.v${process.env.REACT_APP_VERSION}`,
    defaultValue
  )
}
