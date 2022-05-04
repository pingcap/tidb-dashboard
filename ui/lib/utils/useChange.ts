import { useMemoizedFn } from 'ahooks'
import { DependencyList, useEffect } from 'react'
import { useDeepCompareEffect } from 'react-use'

// useChange calls fn when changeList changes.
// It's very similar to useEffect, but does not require fn and its dependencies to be matched.
export function useChange(fn: () => any, changeList: DependencyList) {
  const mfn = useMemoizedFn(fn)
  useEffect(() => {
    mfn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, changeList)
}

export function useDeepCompareChange(
  fn: () => any,
  changeList: DependencyList
) {
  const mfn = useMemoizedFn(fn)
  useDeepCompareEffect(() => {
    mfn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, changeList)
}
