import { Form, Select } from 'antd'
import React, { useCallback } from 'react'
import { DEFAULT_FORM_ITEM_STYLE } from '../utils/helper'
import { ALL_LANGUAGES } from '@lib/utils/i18n'
import _ from 'lodash'
import { useTranslation } from 'react-i18next'

export function LanguageForm() {
  const { t, i18n } = useTranslation()

  const handleLanguageChange = useCallback(
    (langKey) => {
      i18n.changeLanguage(langKey)
    },
    [i18n]
  )

  return (
    <Form layout="vertical" initialValues={{ language: i18n.language }}>
      <Form.Item name="language" label={t('user_profile.i18n.language')}>
        <Select onChange={handleLanguageChange} style={DEFAULT_FORM_ITEM_STYLE}>
          {_.map(ALL_LANGUAGES, (name, key) => {
            return (
              <Select.Option key={key} value={key}>
                {name}
              </Select.Option>
            )
          })}
        </Select>
      </Form.Item>
    </Form>
  )
}
