import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter as Router } from 'react-router-dom'
import { Card, Root } from '@lib/components'
import { SSOForm } from './Form.SSO'
import { SessionForm } from './Form.Session'
import { PrometheusAddressForm } from './Form.PrometheusAddr'
import { VersionForm } from './Form.Version'
import { LanguageForm } from './Form.Language'

import { addTranslations } from '@lib/utils/i18n'
import translations from './translations'
import { UserProfileContext } from './context'

addTranslations(translations)

function App() {
  const ctx = useContext(UserProfileContext)
  if (ctx === null) {
    throw new Error('UserProfileContext must not be null')
  }

  const { t } = useTranslation()
  return (
    <Root>
      <Router>
        <Card title={t('user_profile.session.title')}>
          <SessionForm />
        </Card>
        <Card title={t('user_profile.sso.title')}>
          <SSOForm />
        </Card>
        <Card title={t('user_profile.service_endpoints.title')}>
          <PrometheusAddressForm />
        </Card>
        <Card title={t('user_profile.i18n.title')}>
          <LanguageForm />
        </Card>
        <Card title={t('user_profile.version.title')}>
          <VersionForm />
        </Card>
      </Router>
    </Root>
  )
}

export default App

export * from './context'
