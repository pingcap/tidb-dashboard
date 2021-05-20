import React from 'react'
import { InputNumber } from 'antd'
import { useTranslation } from 'react-i18next'

import type { ApiFormWidget } from './index'

export const IntWidget: ApiFormWidget = ({ param }) => {
  const { t } = useTranslation()
  return (
    <InputNumber
      placeholder={t(`debug_api.widgets.int`, { param: param.name })}
    />
  )
}
