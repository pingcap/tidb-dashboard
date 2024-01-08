// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

import { useMemo, useEffect } from 'react'
import {
  Selection,
  SelectionMode,
  IObjectWithKey
} from 'office-ui-fabric-react/lib/Selection'
import { useGetSet, useSessionStorage } from 'react-use'
import { useMemoizedFn } from 'ahooks'

interface Props<T> {
  storageKey: string
  selections: T[]
  options?: {
    getKey: (s: T) => string
    canSelectItem?: (s: T) => boolean
  }
}

export function useRecordSelection<T>({
  storageKey,
  selections,
  options
}: Props<T>) {
  const memoOption = useMemo(
    () => ({
      getKey: options?.getKey || (() => 'key'),
      canSelectItem: options?.canSelectItem || (() => true)
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [selectedRecordKey, _setSelectedRecordKey] = useSessionStorage<
    string | null
  >(storageKey, null)
  const [getInternalKey, setInternalKey] = useGetSet(selectedRecordKey)
  const setSelectedRecordKey = useMemoizedFn((k: string) => {
    _setSelectedRecordKey(k)
    setInternalKey(k)
  })
  const selectedRecord = useMemo(
    () => selections.find((r) => memoOption.getKey(r) === selectedRecordKey),
    [selections, selectedRecordKey, memoOption]
  )
  const selection = useMemo(() => {
    const s = new Selection({
      selectionMode: SelectionMode.single,
      getKey: memoOption.getKey as
        | ((
            item: IObjectWithKey,
            index?: number | undefined
          ) => string | number)
        | undefined,
      canSelectItem: memoOption.canSelectItem as
        | ((item: IObjectWithKey, index?: number | undefined) => boolean)
        | undefined,
      onSelectionChanged: () => {
        const r = s.getSelection()[0] as T
        if (!r) {
          // A hack to fix the selection zone bug, SelectionZone.tsx L330
          // It will clear the selection state when click disabled item.
          // So we need to reselect the correct target.
          const internalKey = getInternalKey()
          const isSelectedItemInSelections = s
            .getItems()
            .find((r) => memoOption.getKey(r as T) === internalKey)
          if (!!internalKey && isSelectedItemInSelections) {
            s.selectToKey(internalKey)
          }
          return
        }

        const rk = memoOption.getKey(r)
        if (rk !== getInternalKey()) {
          setSelectedRecordKey(rk)
        }
      }
    })
    return s
  }, [memoOption, getInternalKey, setSelectedRecordKey])

  useEffect(() => {
    // Selected record will be cleared by selection itself when update items
    // So we need manual keep the selected state in the selection
    const isRecordInSelections =
      !!selectedRecordKey &&
      selection
        .getItems()
        .find((tr) => memoOption.getKey(tr as T) === selectedRecordKey)
    if (!selection.getSelection().length && isRecordInSelections) {
      selection.selectToKey(selectedRecordKey!)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections])

  return {
    selectedRecord,
    selectedRecordKey,
    selection
  }
}
