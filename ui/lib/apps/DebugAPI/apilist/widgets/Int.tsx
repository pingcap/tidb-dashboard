import React from 'react'
import { InputNumber } from 'antd'
import { useTranslation } from 'react-i18next'

import type { ApiFormWidget } from './index'

export const IntWidget: ApiFormWidget = ({ param, onChange, value }) => {
  const { t } = useTranslation()
  return (
    <InputNumber
      // `undefined` means empty value in InputNumber
      value={value ? parseInt(value!) : undefined}
      onChange={(v) => onChange!(v ? String(v) : (undefined as any))}
      placeholder={t(`debug_api.widgets.int`, { param: param.name })}
    />
  )
}
