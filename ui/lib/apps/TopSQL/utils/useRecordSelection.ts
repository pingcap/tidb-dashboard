// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Selection,
  SelectionMode,
  IObjectWithKey,
} from 'office-ui-fabric-react/lib/Selection'

interface Props<T> {
  selections: T[]
  getKey: (s: T) => string
  disableSelection: (r: T) => boolean
}

export const useRecordSelection = <T>({
  selections,
  getKey = () => 'key',
  disableSelection = () => false,
}: Props<T>) => {
  const [selectedRecordKey, setSelectedRecordKey] = useState('')
  const handleSelect = useCallback(
    (r: T | null) => {
      if (!!r && disableSelection(r)) {
        return
      }

      const areDifferentRecords =
        !!r && (!selectedRecordKey || getKey(r) !== selectedRecordKey)
      if (areDifferentRecords) {
        setSelectedRecordKey(getKey(r))
        return
      }
    },
    [selectedRecordKey]
  )
  const selection = useMemo(() => {
    const s = new Selection({
      items: selections,
      selectionMode: SelectionMode.single,
      canSelectItem: (item) => !disableSelection(item as T),
      getKey: getKey as
        | ((
            item: IObjectWithKey,
            index?: number | undefined
          ) => string | number)
        | undefined,
    })
    return s
  }, [])

  useEffect(() => {
    selection.setItems(selections)

    // Selected record will be cleared by selection itself when update items
    // So we need manual keep the selected state in the selection
    const isRecordInSelections =
      !!selectedRecordKey &&
      selection.getItems().find((tr) => getKey(tr as T) === selectedRecordKey)
    if (!selection.getSelection().length && isRecordInSelections) {
      selection.selectToKey(selectedRecordKey)
    }
  }, [selections, selectedRecordKey])

  return {
    selectedRecordKey,
    selectRecord: handleSelect,
    selection,
  }
}
