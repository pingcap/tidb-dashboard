// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

import { useMemo, useEffect, useCallback } from 'react'
import {
  Selection,
  SelectionMode,
  IObjectWithKey,
} from 'office-ui-fabric-react/lib/Selection'
import { useLocalStorageState } from '@lib/utils/useLocalStorageState'
import { useGetSet } from 'react-use'

interface Props<T> {
  localStorageKey: string
  selections: T[]
  getKey: (s: T) => string
  disableSelection: (r: T) => boolean
}

export const useRecordSelection = <T>({
  localStorageKey,
  selections,
  getKey = () => 'key',
  disableSelection = () => false,
}: Props<T>) => {
  const [selectedRecordKey, _setSelectedRecordKey] = useLocalStorageState(
    localStorageKey,
    ''
  )
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
      canSelectItem: (item) => !disableSelection(item as T),
      onSelectionChanged: () => {
        const r = s.getSelection()[0] as T

        // fluent ui bug, SelectionZone.tsx L330
        // When click disabled item, it will clear the selection state
        // if (!r && getInternalKey()) {
        //   s.selectToKey(getInternalKey())
        // }

        if (!r) {
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
