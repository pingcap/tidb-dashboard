import React from 'react'
import type { FormInstance } from 'antd/es/form/Form'

import { EndpointAPIModel, EndpointAPIParam } from '@lib/client'
import type { Topology } from '../ApiForm'
import { TextWidget } from './Text'
import { TagsWidget } from './Tags'
import { IntWidget } from './Int'
import { HostSelectWidget } from './Host'
import { DatabaseWidget } from './Database'
import { TableWidget } from './Table'
import { TableIDWidget } from './TableID'

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

// For customized form controls. https://ant.design/components/form-cn/#components-form-demo-customized-form-controls
const createJSXElementWrapper = (WidgetDef: ApiFormWidget) => (
  config: ApiFormWidgetConfig
) => <WidgetDef {...config} />

export const paramModelWidgets: Widgets = {
  host: HostSelectWidget,
  text: TextWidget,
  tags: createJSXElementWrapper(TagsWidget),
  int: IntWidget,
  db: createJSXElementWrapper(DatabaseWidget),
  table: createJSXElementWrapper(TableWidget),
  table_id: createJSXElementWrapper(TableIDWidget),
}

export const paramWidgets: Widgets = {}
