import React from 'react'
import { Input } from 'antd'
import { DebugapiEndpointAPI, DebugapiEndpointAPIParam } from '@lib/client'

export interface IApiFormWidgetFactory {
  (config: IApiFormWidgetFactoryConfig): JSX.Element
}

export interface IApiFormWidgetFactoryConfig {
  param: DebugapiEndpointAPIParam
  endpoint: DebugapiEndpointAPI
}

const IPPortSelect: IApiFormWidgetFactory = ({ endpoint }) => {
  return <Input />
}

export const widgetsMap: { [type: string]: IApiFormWidgetFactory } = {
  text: () => <Input />,
  ip_port: IPPortSelect,
}
