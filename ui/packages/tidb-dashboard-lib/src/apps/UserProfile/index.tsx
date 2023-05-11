import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import { Card, Root } from '@lib/components'
import {
  SSOForm,
  SessionForm,
  PrometheusAddressForm,
  VersionForm,
  LanguageForm
} from './components'

import { addTranslations } from '@lib/utils/i18n'
import translations from './translations'
import { UserProfileContext } from './context'
import { useLocationChange } from '@lib/hooks/useLocationChange'

addTranslations(translations)

function UserProfile() {
  const { t } = useTranslation()

  return (
    <>
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
    </>
  )
}

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/user_profile" element={<UserProfile />} />
    </Routes>
  )
}

function App() {
  const ctx = useContext(UserProfileContext)
  if (ctx === null) {
    throw new Error('UserProfileContext must not be null')
  }

  return (
    <Root>
      <Router>
        <AppRoutes />
      </Router>
    </Root>
  )
}

export default App

export * from './context'
