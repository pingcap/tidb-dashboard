// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

import { useState, Dispatch, SetStateAction } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useURLQueryState(
  key: string,
  initialState?: string | (() => string)
): [string, Dispatch<SetStateAction<string>>] {
  const [query, updateQuery] = useSearchParams()
  const [state, _setState] = useState<string>(
    query.get(key) || initialState || ''
  )
  const setState: typeof _setState = (_state) => {
    query.set(key, _state.toString())
    updateQuery(query, { replace: true })
    _setState(_state)
  }
  return [state, setState]
}
