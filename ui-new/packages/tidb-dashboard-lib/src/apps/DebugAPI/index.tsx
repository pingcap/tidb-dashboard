import React, { useContext } from 'react'

import { Root } from '@lib/components'
import { ApiList } from './apilist'

import translations from './translations'
import { addTranslations } from '@lib/utils/i18n'
import { DebugAPIContext } from './context'

addTranslations(translations)

export default function () {
  const ctx = useContext(DebugAPIContext)
  if (ctx === null) {
    throw new Error('DebugAPIContext must not be null')
  }

  return (
    <Root>
      <ApiList />
    </Root>
  )
}

export * from './context'
