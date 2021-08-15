// Copyright 2021 PingCAP, Inc.
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

import { useCallback, useContext, useState } from 'react'

import client, {
  DefaultApi,
  StatementModel,
  StatementTimeRange,
} from '@lib/client'
import { CacheContext, CacheMgr } from '@lib/utils/useCache'

interface StatementCache {
  data: StatementModel[]
  timeRange: StatementTimeRange
}

export function useStatements(cacheKey: string) {
  const { getCache, setCache } = useCache()
  const [statements, setStatements] = useState<StatementModel[]>([])
  const [statementsTimeRange, setStatementsTimeRange] = useState<
    StatementTimeRange
  >({})
  const queryStatements = useCallback(
    async (...params: Parameters<DefaultApi['statementsListGet']>) => {
      const [begin_time, end_time] = params
      const cache = getCache(cacheKey)
      if (cache) {
        setStatements(cache.data)
        setStatementsTimeRange(cache.timeRange)
        return
      }

      const res = await client.getInstance().statementsListGet(...params)
      const data = res?.data || []
      const timeRange = { begin_time, end_time }
      setStatements(data)
      setStatementsTimeRange(timeRange)

      setCache(cacheKey, { data, timeRange })
    },
    [cacheKey, getCache, setCache]
  )

  return { statements, setStatements, statementsTimeRange, queryStatements }
}

function useCache() {
  const cacheMgr = useContext(CacheContext)
  const getCache = (
    ...params: Parameters<CacheMgr['get']>
  ): StatementCache | undefined => {
    if (!cacheMgr) {
      return
    }
    return cacheMgr.get(...params)
  }
  const setCache = (...params: Parameters<CacheMgr['set']>) => {
    if (!cacheMgr) {
      return
    }
    return cacheMgr.set(...params)
  }

  return { getCache, setCache }
}
