import React from 'react'
import type { FormInstance } from 'antd/es/form/Form'
import type { Topology } from '../ApiForm'
import { TextWidget } from './Text'
import { EnumWidget } from './Enum'
import { HostSelectWidget } from './Host'
import { DatabaseWidget } from './Database'
import { TableWidget } from './Table'
import { TableIDWidget } from './TableID'
import { EndpointAPIDefinition, EndpointAPIParamDefinition } from '@lib/client'

export interface Widgets {
  [type: string]: ApiFormWidget
}

export interface ApiFormWidget {
  (config: ApiFormWidgetConfig): JSX.Element
}

export interface ApiFormWidgetConfig {
  form: FormInstance
  param: EndpointAPIParamDefinition
  endpoint: EndpointAPIDefinition
  topology: Topology
  value?: string
  onChange?: (v: string) => void
}

// For customized form controls. https://ant.design/components/form-cn/#components-form-demo-customized-form-controls
const createJSXElementWrapper =
  (WidgetDef: ApiFormWidget) => (config: ApiFormWidgetConfig) =>
    <WidgetDef {...config} />

const paramModelWidgets: Widgets = {
  host: HostSelectWidget,
  text: TextWidget,
  dropdown: EnumWidget,
  db_dropdown: createJSXElementWrapper(DatabaseWidget),
  table_dropdown: createJSXElementWrapper(TableWidget),
  table_id_dropdown: createJSXElementWrapper(TableIDWidget)
}

export const createFormWidget = (config: ApiFormWidgetConfig) => {
  const { param } = config
  const widget = paramModelWidgets[param.ui_kind ?? 'text']
  return widget(config)
}

// query string

export const buildQueryString = (params: EndpointAPIParamDefinition[]) => {
  const query = params.reduce((prev, param, i) => {
    if (i === 0) {
      prev += '?'
    } else {
      prev += '&'
    }
    prev += `${param.name}={${param.name}}`
    return prev
  }, '')
  return query
}
