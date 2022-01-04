// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

import { useMemo, useEffect, useCallback } from 'react'
import {
  Selection,
  SelectionMode,
  IObjectWithKey,
} from 'office-ui-fabric-react/lib/Selection'
import { useGetSet, useSessionStorage } from 'react-use'
import { isNoPlanRecord } from './specialRecord'

interface Props<T> {
  storageKey: string
  selections: T[]
  getKey: (s: T) => string
  canSelectItem?: (s: T) => boolean
}

export const useRecordSelection = <T>({
  storageKey,
  selections,
  getKey = () => 'key',
  canSelectItem = () => true,
}: Props<T>) => {
  const [selectedRecordKey, _setSelectedRecordKey] = useSessionStorage<
    string | null
  >(storageKey, null)
  const [getInternalKey, setInternalKey] = useGetSet(selectedRecordKey)
  const setSelectedRecordKey = useCallback((k: string) => {
    _setSelectedRecordKey(k)
    setInternalKey(k)
  }, [])
  const selectedRecord = useMemo(
    () => selections.find((r) => getKey(r) === selectedRecordKey),
    [selections, selectedRecordKey]
  )
  const selection = useMemo(() => {
    const s = new Selection({
      selectionMode: SelectionMode.single,
      getKey: getKey as
        | ((
            item: IObjectWithKey,
            index?: number | undefined
          ) => string | number)
        | undefined,
      canSelectItem: canSelectItem as
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
            .find((r) => getKey(r as T) === internalKey)
          if (!!internalKey && isSelectedItemInSelections) {
            s.selectToKey(internalKey)
          }
          return
        }

        const rk = getKey(r)
        if (rk !== getInternalKey()) {
          setSelectedRecordKey(rk)
        }
      },
    })
    return s
  }, [])

  useEffect(() => {
    // Selected record will be cleared by selection itself when update items
    // So we need manual keep the selected state in the selection
    const isRecordInSelections =
      !!selectedRecordKey &&
      selection.getItems().find((tr) => getKey(tr as T) === selectedRecordKey)
    if (!selection.getSelection().length && isRecordInSelections) {
      selection.selectToKey(selectedRecordKey)
    }
  }, [selections])

  return {
    selectedRecord,
    selectedRecordKey,
    selection,
  }
}
