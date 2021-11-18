import React from 'react'
import { Select } from 'antd'
import { useTranslation } from 'react-i18next'

import type { ApiFormWidget } from './index'

// sync from https://github.com/pingcap/kvproto/blob/master/pkg/metapb/metapb.pb.go#L42
const options = ['Up', 'Offline', 'Tombstone']

export const StoresStateWidget: ApiFormWidget = ({
  param,
  value,
  onChange,
}) => {
  const { t } = useTranslation()
  return (
    <Select
      mode="multiple"
      placeholder={t(`debug_api.widgets.text`, { param: param.name })}
      value={value ? value.split(',') : []}
      onChange={(items: string[]) => onChange?.(items.join(','))}
    >
      {options.map((option) => (
        <Select.Option key={option} value={option}>
          {option}
        </Select.Option>
      ))}
    </Select>
  )
}
