import React from 'react'
import type { FormInstance } from 'antd/es/form/Form'

import { EndpointAPIModel, EndpointAPIParam } from '@lib/client'
import type { Topology } from '../ApiForm'
import { TextWidget, TextQueryBuilder } from './Text'
import { TagsWidget } from './Tags'
import { IntWidget } from './Int'
import { EnumWidget } from './Enum'
import { ConstantWidget, ConstantQueryBuilder } from './Constant'
import { HostSelectWidget } from './Host'
import { DatabaseWidget } from './Database'
import { TableWidget } from './Table'
import { TableIDWidget } from './TableID'
import { StoresStateWidget } from './StoresState'

export interface Widgets {
  [type: string]: ApiFormWidget
}

export interface ApiFormWidget {
  (config: ApiFormWidgetConfig): JSX.Element
}

export interface ApiFormWidgetConfig {
  form: FormInstance
  param: EndpointAPIParam
  endpoint: EndpointAPIModel
  topology: Topology
  value?: string
  onChange?: (v: string) => void
}

export interface ParamModelType {
  type: string
  data: any
}

// For customized form controls. https://ant.design/components/form-cn/#components-form-demo-customized-form-controls
const createJSXElementWrapper = (WidgetDef: ApiFormWidget) => (
  config: ApiFormWidgetConfig
) => <WidgetDef {...config} />

const paramModelWidgets: Widgets = {
  host: HostSelectWidget,
  text: TextWidget,
  tags: createJSXElementWrapper(TagsWidget),
  int: createJSXElementWrapper(IntWidget),
  enum: EnumWidget,
  constant: ConstantWidget,
  db: createJSXElementWrapper(DatabaseWidget),
  table: createJSXElementWrapper(TableWidget),
  table_id: createJSXElementWrapper(TableIDWidget),
}

const paramWidgets: Widgets = {
  'pd_stores/state': createJSXElementWrapper(StoresStateWidget),
}

export const createFormWidget = (config: ApiFormWidgetConfig) => {
  const { param, endpoint } = config
  const widget =
    paramWidgets[`${endpoint.id}/${param.name!}`] ||
    paramModelWidgets[(param.model as any).type] ||
    paramModelWidgets.text
  return widget(config)
}

// query string

export interface QueryBuilder {
  (p: EndpointAPIParam): string
}

const queryBuilders: { [type: string]: QueryBuilder } = {
  text: TextQueryBuilder,
  constant: ConstantQueryBuilder,
}

export const buildQueryString = (params: EndpointAPIParam[]) => {
  const query = params.reduce((prev, param, i) => {
    if (i === 0) {
      prev += '?'
    } else {
      prev += '&'
    }

    const builder =
      queryBuilders[(param.model as ParamModelType).type] || queryBuilders.text
    prev += builder(param)

    return prev
  }, '')
  return query
}
