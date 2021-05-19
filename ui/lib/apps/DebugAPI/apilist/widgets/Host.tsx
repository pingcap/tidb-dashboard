import React from 'react'
import { Select } from 'antd'
import { useTranslation } from 'react-i18next'

import type { ApiFormWidget } from './index'

export const HostSelectWidget: ApiFormWidget = ({ endpoint, topology }) => {
  const { t } = useTranslation()
  const componentEndpoints = topology[endpoint.component!]

  return (
    <Select
      showSearch
      placeholder={t(`debug_api.widgets.host_select_placeholder`, {
        endpointType: endpoint.component,
      })}
    >
      {componentEndpoints.map((d) => {
        const val = `${d.ip}:${d.status_port}`
        return (
          <Select.Option key={val} value={val}>
            {val}
          </Select.Option>
        )
      })}
    </Select>
  )
}
