import React from 'react'
import { Input } from 'antd'
import { useTranslation } from 'react-i18next'

import type { ApiFormWidget } from './index'

export const TextWidget: ApiFormWidget = ({ param }) => {
  const { t } = useTranslation()
  return (
    <Input placeholder={t(`debug_api.widgets.text`, { param: param.name })} />
  )
}
