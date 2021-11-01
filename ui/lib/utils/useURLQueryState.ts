// Copyright 2021 Suhaha
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
