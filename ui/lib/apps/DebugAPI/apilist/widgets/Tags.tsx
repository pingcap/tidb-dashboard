import React from 'react'
import { Select } from 'antd'
import { useTranslation } from 'react-i18next'

import type { ApiFormWidget } from './index'

export const TagsWidget: ApiFormWidget = ({ param, value, onChange }) => {
  const { t } = useTranslation()
  return (
    <Select
      mode="tags"
      placeholder={t(`debug_api.widgets.text`, { param: param.name })}
      value={value ? value.split(',').map((v) => decodeURIComponent(v)) : []}
      onChange={(items: string[]) =>
        onChange?.(items.map((v) => encodeURIComponent(v)).join(','))
      }
    ></Select>
  )
}
