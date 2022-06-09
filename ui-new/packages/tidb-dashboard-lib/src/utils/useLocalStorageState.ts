import { useLocalStorageState as useAhooksLocalStorageState } from 'ahooks'

// attachVersion will use the version field in package.json as the postfix for the localstorage key
// we can **update version field in package.json** to upgrade local storage version key
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T | (() => T),
  attachVersion = false
) {
  return useAhooksLocalStorageState(
    attachVersion ? `${key}.v${process.env.REACT_APP_VERSION}` : key,
    {
      defaultValue
    }
  )
}
