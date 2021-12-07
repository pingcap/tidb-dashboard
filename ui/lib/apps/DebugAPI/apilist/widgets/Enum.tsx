import React from 'react'
import { Select } from 'antd'
import { useTranslation } from 'react-i18next'

import type { ApiFormWidget, ParamModelType } from './index'

export const EnumWidget: ApiFormWidget = ({ param }) => {
  const { t } = useTranslation()
  return (
    <Select placeholder={t(`debug_api.widgets.enum`, { param: param.name })}>
      {((param.model as ParamModelType).data as {
        name: string
        value: string
      }[]).map((option) => (
        <Select.Option key={option.value} value={option.value}>
          {option.name}
        </Select.Option>
      ))}
    </Select>
  )
}
