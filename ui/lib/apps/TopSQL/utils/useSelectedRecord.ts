// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

import { useCallback, useEffect, useMemo } from 'react'
import { useGetSet } from 'react-use'
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

export const useSelectedRecord = <T>({
  selections,
  getKey = () => 'key',
  disableSelection = () => false,
}: Props<T>) => {
  const [getRecord, setRecord] = useGetSet<T | null>(null)
  const handleSelect = useCallback((r: T | null) => {
    if (!!r && disableSelection(r)) {
      return
    }

    const prevRecord = getRecord()
    const areDifferentRecords =
      !!r && (!prevRecord || getKey(r) !== getKey(prevRecord))
    if (areDifferentRecords) {
      setRecord(r)
      return
    }
  }, [])
  const selection = useMemo(() => {
    const s = new Selection({
      selectionMode: SelectionMode.single,
      getKey: getKey as
        | ((
            item: IObjectWithKey,
            index?: number | undefined
          ) => string | number)
        | undefined,
      onSelectionChanged: () => {
        const r = getRecord()
        const isRecordInSelections =
          !!r && s.getItems().find((tr) => getKey(tr as T) === getKey(r))
        if (!s.getSelection().length && isRecordInSelections) {
          s.selectToKey(getKey(r))
        }
      },
    })
    return s
  }, [selections])

  useEffect(() => {
    const r = getRecord()
    if (!r || selections.find((tr) => getKey(tr) === getKey(r))) {
      return
    }
    setRecord(null)
  }, [selections])

  return {
    getSelectedRecord: getRecord,
    setSelectedRecord: handleSelect,
    selection,
  }
}
