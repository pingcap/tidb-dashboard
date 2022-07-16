import { useLocalStorageState } from 'ahooks'
import { Options } from 'ahooks/lib/createUseStorageState'

// These type definitions is a workaround for https://github.com/alibaba/hooks/issues/1582
export interface IFuncUpdaterWithDefaultValue<T> {
  (previousState: T): T
}

// export interface OptionsWithDefaultValue<T> extends Options<T> {
//   defaultValue: T | IFuncUpdaterWithDefaultValue<T>
// }

export type StorageStateResultHasDefaultValue<T> = [
  T,
  (value?: T | IFuncUpdaterWithDefaultValue<T>) => void
]

// Use the version field in package.json as the postfix for the localstorage key
// we can **update version field in package.json** to upgrade local storage version key
export function useVersionedLocalStorageState<T>(
  key: string,
  // options: OptionsWithDefaultValue<T>
  options: Options<T>
): StorageStateResultHasDefaultValue<T> {
  return useLocalStorageState(
    `v${process.env.REACT_APP_VERSION}.${key}`,
    options
  ) as any
}
