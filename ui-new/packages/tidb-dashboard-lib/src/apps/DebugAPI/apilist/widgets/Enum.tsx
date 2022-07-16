import React from 'react'
import { Select } from 'antd'

import type { ApiFormWidget } from './index'

export const EnumWidget: ApiFormWidget = ({ param }) => {
  return (
    <Select>
      {(
        ((param.ui_props as any)?.items as {
          value: string
          display_as: string
        }[]) ?? []
      ).map((option) => (
        <Select.Option key={option.value} value={option.value}>
          {option.display_as
            ? `${option.value} (${option.display_as})`
            : option.value}
        </Select.Option>
      ))}
    </Select>
  )
}
