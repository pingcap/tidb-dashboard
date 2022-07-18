import React, { useContext } from 'react'
import { HashRouter as Router } from 'react-router-dom'

import { Root } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'

import translations from './translations'
import { MetricsContext } from './context'
import { useLocationChange } from '@lib/hooks/useLocationChange'
import Metrics from './components/Metrics'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()
  return <Metrics />
}

export default function () {
  const ctx = useContext(MetricsContext)
  if (ctx === null) {
    throw new Error('MetricsContext must not be null')
  }

  return (
    <Root>
      <Router>
        <AppRoutes />
      </Router>
    </Root>
  )
}

export * from './context'
