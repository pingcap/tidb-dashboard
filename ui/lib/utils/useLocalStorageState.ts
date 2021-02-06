import { useLocalStorageState as _useLocalStorageState } from 'ahooks'

export interface IFuncUpdater<T> {
  (previousState: T): T
}

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T
): [T, (value?: T | IFuncUpdater<T>) => void] {
  return _useLocalStorageState(key, defaultValue) as [
    T,
    (value?: T | IFuncUpdater<T>) => void
  ]
}
