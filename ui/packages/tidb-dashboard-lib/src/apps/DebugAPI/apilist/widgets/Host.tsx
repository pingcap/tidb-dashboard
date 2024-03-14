import React from 'react'
import { Select } from 'antd'
import { useTranslation } from 'react-i18next'

import type { ApiFormWidget } from './index'
import { distro } from '@lib/utils/distro'

const portKeys: { [k: string]: string } = {
  tidb: 'status_port',
  tikv: 'status_port',
  tiflash: 'status_port',
  pd: 'port',
  tiproxy: 'status_port'
}

export const HostSelectWidget: ApiFormWidget = ({ endpoint, topology }) => {
  const { t } = useTranslation()
  const componentEndpoints = topology[endpoint.component!]
  const portKey = portKeys[endpoint.component!]

  return (
    <Select
      showSearch
      placeholder={t(`debug_api.widgets.host_select_placeholder`, {
        endpointType: distro()[endpoint.component!]?.toLowerCase()
      })}
    >
      {componentEndpoints.map((d) => {
        const val = `${d.ip}:${d[portKey]}`
        return (
          <Select.Option key={val} value={val}>
            {val}
          </Select.Option>
        )
      })}
    </Select>
  )
}
