import React from 'react'
import { Input, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { DebugapiEndpointAPIModel, DebugapiEndpointAPIParam } from '@lib/client'
import type { Topology } from './ApiForm'

export interface Widgets {
  [type: string]: ApiFormWidget
}

export interface ApiFormWidget {
  (config: ApiFormWidgetConfig): JSX.Element
}

export interface ApiFormWidgetConfig {
  param: DebugapiEndpointAPIParam
  endpoint: DebugapiEndpointAPIModel
  topology: Topology
}

const TextWidget: ApiFormWidget = ({ param }) => {
  const { t } = useTranslation()
  return (
    <Input placeholder={t(`debug_api.widgets.text`, { param: param.name })} />
  )
}

const HostSelectWidget: ApiFormWidget = ({ endpoint, topology }) => {
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

export const paramModelWidgets: Widgets = {
  text: TextWidget,
  host: HostSelectWidget,
}

export const paramWidgets: Widgets = {}
