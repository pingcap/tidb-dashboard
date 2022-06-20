import React, { useContext } from 'react'
import { Root } from '@lib/components'
import KeyViz from './components/KeyViz'

import translations from './translations'
import { addTranslations } from '@lib/utils/i18n'
import { KeyVizContext } from './context'

addTranslations(translations)

export default () => {
  const ctx = useContext(KeyVizContext)
  if (ctx === null) {
    throw new Error('KeyVizContext must not be null')
  }

  return (
    <Root>
      <KeyViz />
    </Root>
  )
}

export * from './context'
