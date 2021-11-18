import React from 'react'
import { Input } from 'antd'
import { useTranslation } from 'react-i18next'

import type { ApiFormWidget, QueryBuilder } from './index'

export const TextWidget: ApiFormWidget = ({ param }) => {
  const { t } = useTranslation()
  return (
    <Input placeholder={t(`debug_api.widgets.text`, { param: param.name })} />
  )
}

export const TextQueryBuilder: QueryBuilder = (p) => {
  return `${p.name}={${p.name}}`
}
