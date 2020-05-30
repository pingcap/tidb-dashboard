import { Switch, Form, Select } from 'antd'
import _ from 'lodash'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Card, Root } from '@lib/components'
import { ALL_LANGUAGES } from '@lib/utils/i18n'
import { switchDarkMode } from '@lib/utils/themeSwitch'

function LanguageForm() {
  const { t, i18n } = useTranslation()

  function handleLanguageChange(langKey) {
    i18n.changeLanguage(langKey)
  }

  return (
    <Card title={t('dashboard_settings.i18n.title')}>
      <Form layout="vertical" initialValues={{ language: i18n.language }}>
        <Form.Item
          name="language"
          label={t('dashboard_settings.i18n.language')}
        >
          <Select onChange={handleLanguageChange} style={{ width: 200 }}>
            {_.map(ALL_LANGUAGES, (name, key) => {
              return (
                <Select.Option key={key} value={key}>
                  {name}
                </Select.Option>
              )
            })}
          </Select>
        </Form.Item>
        <Form.Item name="theme" label={t('dashboard_settings.theme_switcher')}>
          <Switch
            onChange={(v) => {
              switchDarkMode(v, true)
              console.log(`Dark Mode ${v ? 'on' : 'off'}!`)
            }}
          />
        </Form.Item>
      </Form>
    </Card>
  )
}

const App = () => (
  <Root>
    <LanguageForm />
  </Root>
)

export default App
