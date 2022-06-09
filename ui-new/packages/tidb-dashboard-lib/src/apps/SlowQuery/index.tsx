import React, { useContext } from 'react'
import { Root } from '@lib/components'
import { Route, Routes } from 'react-router-dom'
import useCache, { CacheContext } from '@lib/utils/useCache'

import { List, Detail } from './pages'

import { addTranslations } from '@lib/utils/i18n'

import translations from './translations'
import { SlowQueryContext } from './context'

addTranslations(translations)

export default function () {
  const slowQueryCacheMgr = useCache(2)

  const cxt = useContext(SlowQueryContext)

  if (cxt === null) {
    throw new Error('SlowQueryContext must not be null')
  }

  return (
    <Root>
      <CacheContext.Provider value={slowQueryCacheMgr}>
        <Routes>
          <Route path='/' element={<List />} />
          <Route path='detail' element={<Detail />} />
        </Routes>
      </CacheContext.Provider>
    </Root>
  )
}

export * from './components'
export * from './pages'
export * from './utils/useSlowQueryTableController'
export { default as useSlowQueryTableController } from './utils/useSlowQueryTableController'

export * from './context'
