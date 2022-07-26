import React, { useContext } from 'react'
import { HashRouter as Router } from 'react-router-dom'

import { Root } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'

import translations from './translations'
import { MonitoringContext } from './context'
import { useLocationChange } from '@lib/hooks/useLocationChange'
import Monitoring from './components/Monitoring'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()
  return <Monitoring />
}

export default function () {
  const ctx = useContext(MonitoringContext)
  if (ctx === null) {
    throw new Error('MonitoringContext must not be null')
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
